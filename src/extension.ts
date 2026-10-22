import * as vscode from 'vscode';
import { ActionsPanel } from './webview/host/ActionsPanel';
import { ComponentsViewProvider } from './views/ComponentsView';
import { WorkflowDiscovery } from './workflows/discovery';
import { WorkflowFileTreeItem, WorkflowJobTreeItem, WorkflowsViewProvider } from './views/WorkflowsView';
import { RunStore } from './runs/store';
import { ActRunner } from './act/runner';
import { WorkflowRun } from './runs/types';

export function activate(context: vscode.ExtensionContext): void {
  const store = new RunStore(context.globalStorageUri.fsPath);
  store.init();

  const componentsProvider = new ComponentsViewProvider();
  vscode.window.registerTreeDataProvider('localActions.componentsView', componentsProvider);

  const discovery = new WorkflowDiscovery();
  const workflowsProvider = new WorkflowsViewProvider(discovery);
  vscode.window.registerTreeDataProvider('localActions.workflowsView', workflowsProvider);

  const activeRunners = new Map<string, ActRunner>();

  const executeRun = async (workflowFilePath: string, jobId?: string): Promise<WorkflowRun | undefined> => {
    const config = vscode.workspace.getConfiguration('localActions');
    const actPath = config.get<string>('actPath') || 'act';
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();

    const workflow = discovery.getWorkflows().find((w) => w.filePath === workflowFilePath);
    const workflowName = workflow?.name ?? workflowFilePath.split(/[/\\]/).pop() ?? 'Workflow';

    const runId = `run-${Date.now()}`;
    const run: WorkflowRun = {
      id: runId,
      workflowFilePath,
      workflowName,
      event: workflow?.events[0] || 'push',
      status: 'queued',
      startedAt: new Date().toISOString(),
      trigger: 'manual',
      jobs: workflow?.jobs.map((j) => ({
        id: j.id,
        name: j.name,
        status: 'queued',
        needs: j.needs,
        steps: []
      })) ?? []
    };

    const runner = new ActRunner(
      actPath,
      workspaceFolder,
      run,
      {
        workflowPath: workflowFilePath,
        jobId,
        useHostRunner: true,
        jsonOutput: true
      },
      [],
      store,
      {
        onDidUpdateRun: (updated) => {
          ActionsPanel.currentPanel?.postRunUpdated(updated);
        }
      }
    );

    activeRunners.set(runId, runner);

    return runner.start().finally(() => {
      activeRunners.delete(runId);
    });
  };

  const cancelRun = async (runId: string): Promise<void> => {
    const runner = activeRunners.get(runId);
    if (runner) {
      await runner.cancel();
      activeRunners.delete(runId);
    }
  };

  context.subscriptions.push(
    discovery.registerWatcher(),

    vscode.commands.registerCommand('localActions.openActionsPage', () => {
      ActionsPanel.render(
        context.extensionUri,
        store,
        discovery,
        (filePath) => executeRun(filePath).then(() => undefined),
        cancelRun
      );
    }),

    vscode.commands.registerCommand('localActions.refreshComponents', () => {
      return componentsProvider.refresh();
    }),

    vscode.commands.registerCommand('localActions.refreshWorkflows', () => {
      return workflowsProvider.refresh();
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
        return;
      }
      vscode.window.showInformationMessage(`Running workflow: ${item.workflow.name}`);
      const result = await executeRun(item.workflow.filePath);
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
      const result = await executeRun(item.workflow.filePath, item.job.id);
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
      if (event.affectsConfiguration('localActions.actPath')) {
        componentsProvider.refresh();
      }
    })
  );

  discovery.scan();
}

export function deactivate(): void {
  if (ActionsPanel.currentPanel) {
    ActionsPanel.currentPanel.dispose();
  }
}
