import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { ActionsPanel } from './webview/host/ActionsPanel';
import { ComponentsViewProvider } from './views/ComponentsView';
import { WorkflowDiscovery } from './workflows/discovery';
import { WorkflowFileTreeItem, WorkflowJobTreeItem, WorkflowsViewProvider } from './views/WorkflowsView';
import { SettingsLeafItem, SettingsViewProvider } from './views/SettingsView';
import { SecretsManager } from './settings/secrets';
import { RunStore } from './runs/store';
import { ActRunner } from './act/runner';
import { RunStep, WorkflowRun } from './runs/types';
import { RunWorkflowPayload } from './shared/messages';

const activeRunners = new Map<string, ActRunner>();

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const store = new RunStore(context.globalStorageUri.fsPath);
  await store.init();

  const workspaceFolderUri = vscode.workspace.workspaceFolders?.[0]?.uri.toString() ?? 'global';
  const secretsManager = new SecretsManager(context.secrets, context.workspaceState, workspaceFolderUri);

  const componentsProvider = new ComponentsViewProvider();
  vscode.window.registerTreeDataProvider('localActions.componentsView', componentsProvider);

  const discovery = new WorkflowDiscovery();
  const workflowsProvider = new WorkflowsViewProvider(discovery);
  vscode.window.registerTreeDataProvider('localActions.workflowsView', workflowsProvider);

  const settingsProvider = new SettingsViewProvider(secretsManager);
  vscode.window.registerTreeDataProvider('localActions.settingsView', settingsProvider);

  const executeRun = async (payload: RunWorkflowPayload): Promise<WorkflowRun | undefined> => {
    const config = vscode.workspace.getConfiguration('localActions');
    const actPath = config.get<string>('actPath') || 'act';
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();

    const workflow = discovery.getWorkflows().find((w) => w.filePath === payload.workflowFilePath);
    const workflowName = workflow?.name ?? payload.workflowFilePath.split(/[/\\]/).pop() ?? 'Workflow';

    const secrets = await secretsManager.getAllSecrets();
    const secretsToRedact = Object.values(secrets).filter((s) => s.length >= 3);

    const configuredVariables = config.get<Record<string, string>>('variables') || {};
    const configuredInputs = config.get<Record<string, string>>('defaultInputs') || {};
    const configuredRunners = config.get<Record<string, string>>('runners') || {};
    const configuredUseHost = config.get<boolean>('useHostRunner', true);
    const noCache = config.get<boolean>('noCacheServer', false);
    const artifactPath = config.get<string>('artifactServerPath', '');
    const retentionLimit = config.get<number>('historyRetention', 50);
    const extraArgs = [...(config.get<string[]>('extraArgs') || [])];

    if (noCache) {
      extraArgs.push('--no-cache-server');
    }
    if (artifactPath.trim().length > 0) {
      extraArgs.push('--artifact-server-path', artifactPath.trim());
    }

    let eventPayloadPath: string | undefined;
    if (payload.payloadJson && payload.payloadJson.trim().length > 0) {
      const tempPath = path.join(os.tmpdir(), `act-payload-${Date.now()}.json`);
      await fs.writeFile(tempPath, payload.payloadJson, 'utf8');
      eventPayloadPath = tempPath;
    }

    const mergedInputs = {
      ...configuredInputs,
      ...(payload.inputs || {})
    };

    const platforms = {
      ...configuredRunners
    };
    if (payload.platformOverride && payload.platformOverride.trim().length > 0) {
      const override = payload.platformOverride.trim();
      platforms['ubuntu-latest'] = override;
      if (workflow) {
        for (const job of workflow.jobs) {
          if (typeof job.runsOn === 'string' && job.runsOn.trim()) {
            platforms[job.runsOn.trim()] = override;
          } else if (Array.isArray(job.runsOn)) {
            for (const r of job.runsOn) {
              if (typeof r === 'string' && r.trim()) {
                platforms[r.trim()] = override;
              }
            }
          }
        }
      }
    }

    const useHostRunner = payload.useHostRunner !== undefined ? payload.useHostRunner : configuredUseHost;

    if (useHostRunner && workflow) {
      for (const job of workflow.jobs) {
        if (typeof job.runsOn === 'string' && job.runsOn.trim()) {
          const key = job.runsOn.trim();
          if (!platforms[key]) {
            platforms[key] = '-self-hosted';
          }
        } else if (Array.isArray(job.runsOn)) {
          for (const r of job.runsOn) {
            if (typeof r === 'string' && r.trim()) {
              const key = r.trim();
              if (!platforms[key]) {
                platforms[key] = '-self-hosted';
              }
            }
          }
        }
      }
    }

    const runId = `run-${Date.now()}`;
    const run: WorkflowRun = {
      id: runId,
      workflowFilePath: payload.workflowFilePath,
      workflowName,
      event: payload.event || workflow?.events[0] || 'push',
      status: 'queued',
      startedAt: new Date().toISOString(),
      trigger: payload.event || 'manual',
      inputs: payload.inputs,
      useHostRunner,
      platformOverride: payload.platformOverride,
      jobs: workflow?.jobs.map((j) => {
        const initialSteps: RunStep[] = [];
        if (j.steps && j.steps.length > 0) {
          initialSteps.push({
            id: 'Set up job',
            name: 'Set up job',
            status: 'queued',
            logLinesCount: 0
          });
          for (const s of j.steps) {
            initialSteps.push({
              id: s.id || s.name,
              name: s.name,
              status: 'queued',
              logLinesCount: 0
            });
          }
          initialSteps.push({
            id: 'Complete job',
            name: 'Complete job',
            status: 'queued',
            logLinesCount: 0
          });
        }
        return {
          id: j.id,
          name: j.name,
          status: 'queued',
          needs: j.needs,
          steps: initialSteps
        };
      }) ?? []
    };

    const runner = new ActRunner(
      actPath,
      workspaceFolder,
      run,
      {
        workflowPath: payload.workflowFilePath,
        jobId: payload.jobId,
        event: payload.event,
        eventPayloadPath,
        secrets,
        variables: configuredVariables,
        inputs: Object.keys(mergedInputs).length > 0 ? mergedInputs : undefined,
        platforms: Object.keys(platforms).length > 0 ? platforms : undefined,
        useHostRunner,
        extraArgs: extraArgs.length > 0 ? extraArgs : undefined,
        jsonOutput: true
      },
      secretsToRedact,
      store,
      {
        onDidUpdateRun: (updated) => {
          ActionsPanel.currentPanel?.postRunUpdated(updated);
        }
      },
      retentionLimit
    );

    activeRunners.set(runId, runner);

    return runner.start().finally(async () => {
      activeRunners.delete(runId);
      if (eventPayloadPath) {
        try {
          await fs.unlink(eventPayloadPath);
        } catch {
          // Ignore temp cleanup error
        }
      }
    });
  };

  const cancelRun = async (runId: string): Promise<void> => {
    const runner = activeRunners.get(runId);
    if (runner) {
      await runner.cancel();
      activeRunners.delete(runId);
    }
  };

  const openActionsPageWithDialog = (filePath?: string, jobId?: string) => {
    const panel = ActionsPanel.render(
      context.extensionUri,
      store,
      discovery,
      executeRun,
      cancelRun
    );
    panel.openRunDialog(filePath, jobId);
  };

  context.subscriptions.push(
    discovery.registerWatcher(),

    vscode.window.registerTreeDataProvider('localActions.dashboardView', {
      getTreeItem: () => ({}),
      getChildren: () => []
    }),

    vscode.commands.registerCommand('localActions.openActionsDashboard', () => {
      ActionsPanel.render(
        context.extensionUri,
        store,
        discovery,
        executeRun,
        cancelRun
      );
    }),

    vscode.commands.registerCommand('localActions.openActionsPage', () => {
      ActionsPanel.render(
        context.extensionUri,
        store,
        discovery,
        executeRun,
        cancelRun
      );
    }),

    vscode.commands.registerCommand('localActions.runWorkflowWithInputs', (item?: WorkflowFileTreeItem | WorkflowJobTreeItem) => {
      if (item instanceof WorkflowJobTreeItem) {
        openActionsPageWithDialog(item.workflow.filePath, item.job.id);
      } else if (item instanceof WorkflowFileTreeItem) {
        openActionsPageWithDialog(item.workflow.filePath);
      } else {
        openActionsPageWithDialog();
      }
    }),

    vscode.commands.registerCommand('localActions.refreshComponents', () => {
      return componentsProvider.refresh();
    }),

    vscode.commands.registerCommand('localActions.refreshWorkflows', () => {
      return workflowsProvider.refresh();
    }),

    vscode.commands.registerCommand('localActions.refreshSettings', () => {
      settingsProvider.refresh();
    }),

    vscode.commands.registerCommand('localActions.addSecret', async () => {
      const key = await vscode.window.showInputBox({
        title: 'Add Secret',
        prompt: 'Enter secret name (e.g. GITHUB_TOKEN)'
      });
      if (!key || !key.trim()) {
        return;
      }
      const val = await vscode.window.showInputBox({
        title: `Enter value for ${key.trim()}`,
        password: true
      });
      if (val === undefined) {
        return;
      }
      await secretsManager.setSecret(key.trim(), val);
      vscode.window.showInformationMessage(`Secret ${key.trim()} saved securely.`);
    }),

    vscode.commands.registerCommand('localActions.deleteSecret', async (item?: SettingsLeafItem) => {
      let key = item?.keyName;
      if (!key) {
        const keys = secretsManager.getSecretKeys();
        key = await vscode.window.showQuickPick(keys, { title: 'Select secret to delete' });
      }
      if (key) {
        await secretsManager.deleteSecret(key);
        vscode.window.showInformationMessage(`Secret ${key} deleted.`);
      }
    }),

    vscode.commands.registerCommand('localActions.addVariable', async () => {
      const key = await vscode.window.showInputBox({
        title: 'Add Variable',
        prompt: 'Enter variable name (e.g. ENVIRONMENT)'
      });
      if (!key || !key.trim()) {
        return;
      }
      const val = await vscode.window.showInputBox({
        title: `Enter value for ${key.trim()}`
      });
      if (val === undefined) {
        return;
      }
      const config = vscode.workspace.getConfiguration('localActions');
      const vars = { ...(config.get<Record<string, string>>('variables') || {}) };
      vars[key.trim()] = val;
      await config.update('variables', vars, vscode.ConfigurationTarget.Workspace);
      settingsProvider.refresh();
    }),

    vscode.commands.registerCommand('localActions.deleteVariable', async (item?: SettingsLeafItem) => {
      const config = vscode.workspace.getConfiguration('localActions');
      const vars = { ...(config.get<Record<string, string>>('variables') || {}) };
      let key = item?.keyName;
      if (!key) {
        key = await vscode.window.showQuickPick(Object.keys(vars), { title: 'Select variable to delete' });
      }
      if (key && vars[key] !== undefined) {
        delete vars[key];
        await config.update('variables', vars, vscode.ConfigurationTarget.Workspace);
        settingsProvider.refresh();
      }
    }),

    vscode.commands.registerCommand('localActions.openWorkflowFile', async (item?: WorkflowFileTreeItem | WorkflowJobTreeItem) => {
      const filePath = item?.workflow.filePath;
      if (filePath) {
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);
      }
    }),

    vscode.commands.registerCommand('localActions.runWorkflow', async (item?: WorkflowFileTreeItem) => {
      if (!item?.workflow) {
        openActionsPageWithDialog();
        return;
      }
      if (item.workflow.inputs.length > 0) {
        openActionsPageWithDialog(item.workflow.filePath);
        return;
      }
      vscode.window.showInformationMessage(`Running workflow: ${item.workflow.name}`);
      const result = await executeRun({ workflowFilePath: item.workflow.filePath });
      if (result?.status === 'success') {
        vscode.window.showInformationMessage(`Workflow succeeded: ${result.workflowName}`);
      } else if (result?.status === 'failure') {
        vscode.window.showErrorMessage(`Workflow failed: ${result.workflowName}`);
      }
    }),

    vscode.commands.registerCommand('localActions.runJob', async (item?: WorkflowJobTreeItem) => {
      if (!item?.workflow || !item?.job) {
        return;
      }
      vscode.window.showInformationMessage(`Running job: ${item.job.name}`);
      const result = await executeRun({
        workflowFilePath: item.workflow.filePath,
        jobId: item.job.id
      });
      if (result?.status === 'success') {
        vscode.window.showInformationMessage(`Job succeeded: ${item.job.name}`);
      } else if (result?.status === 'failure') {
        vscode.window.showErrorMessage(`Job failed: ${item.job.name}`);
      }
    }),

    vscode.commands.registerCommand('localActions.openActInstallGuide', async () => {
      const choice = await vscode.window.showInformationMessage(
        'nektos/act was not found. How would you like to proceed?',
        'Open Documentation',
        'Configure act Path'
      );
      if (choice === 'Open Documentation') {
        vscode.env.openExternal(vscode.Uri.parse('https://nektosact.com/installation/index.html'));
      } else if (choice === 'Configure act Path') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'localActions.actPath');
      }
    }),

    vscode.commands.registerCommand('localActions.openDockerGuide', async () => {
      const choice = await vscode.window.showInformationMessage(
        'Docker Engine is optional. Container runners require Docker, but host runners run directly on your system.',
        'Open Docker Documentation',
        'OK'
      );
      if (choice === 'Open Docker Documentation') {
        vscode.env.openExternal(vscode.Uri.parse('https://docs.docker.com/get-docker/'));
      }
    }),

    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('localActions')) {
        componentsProvider.refresh();
        settingsProvider.refresh();
      }
    })
  );

  await discovery.scan();
}

export function deactivate(): void {
  for (const runner of activeRunners.values()) {
    runner.cancel();
  }
  activeRunners.clear();

  if (ActionsPanel.currentPanel) {
    ActionsPanel.currentPanel.dispose();
  }
}
