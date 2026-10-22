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

  context.subscriptions.push(
    discovery.registerWatcher(),

    vscode.commands.registerCommand('localActions.openActionsPage', () => {
      ActionsPanel.render(context.extensionUri);
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

      const config = vscode.workspace.getConfiguration('localActions');
      const actPath = config.get<string>('actPath') || 'act';
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();

      const run: WorkflowRun = {
        id: `run-${Date.now()}`,
        workflowFilePath: item.workflow.filePath,
        workflowName: item.workflow.name,
        event: item.workflow.events[0] || 'push',
        status: 'queued',
        startedAt: new Date().toISOString(),
        trigger: 'manual',
        jobs: item.workflow.jobs.map((j) => ({
          id: j.id,
          name: j.name,
          status: 'queued',
          needs: j.needs,
          steps: []
        }))
      };

      vscode.window.showInformationMessage(`Running workflow: ${item.workflow.name}`);
      const runner = new ActRunner(
        actPath,
        workspaceFolder,
        run,
        {
          workflowPath: item.workflow.filePath,
          useHostRunner: true,
          jsonOutput: true
        },
        [],
        store
      );

      runner.start().then((result) => {
        if (result.status === 'success') {
          vscode.window.showInformationMessage(`Workflow succeeded: ${result.workflowName}`);
        } else if (result.status === 'failure') {
          vscode.window.showErrorMessage(`Workflow failed: ${result.workflowName}`);
        }
      });
    }),

    vscode.commands.registerCommand('localActions.runJob', async (item?: WorkflowJobTreeItem) => {
      if (!item?.workflow || !item?.job) {
        return;
      }

      const config = vscode.workspace.getConfiguration('localActions');
      const actPath = config.get<string>('actPath') || 'act';
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();

      const run: WorkflowRun = {
        id: `run-${Date.now()}`,
        workflowFilePath: item.workflow.filePath,
        workflowName: item.workflow.name,
        event: item.workflow.events[0] || 'push',
        status: 'queued',
        startedAt: new Date().toISOString(),
        trigger: 'manual',
        jobs: [
          {
            id: item.job.id,
            name: item.job.name,
            status: 'queued',
            needs: item.job.needs,
            steps: []
          }
        ]
      };

      vscode.window.showInformationMessage(`Running job: ${item.job.name}`);
      const runner = new ActRunner(
        actPath,
        workspaceFolder,
        run,
        {
          workflowPath: item.workflow.filePath,
          jobId: item.job.id,
          useHostRunner: true,
          jsonOutput: true
        },
        [],
        store
      );

      runner.start().then((result) => {
        if (result.status === 'success') {
          vscode.window.showInformationMessage(`Job succeeded: ${item.job.name}`);
        } else if (result.status === 'failure') {
          vscode.window.showErrorMessage(`Job failed: ${item.job.name}`);
        }
      });
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
