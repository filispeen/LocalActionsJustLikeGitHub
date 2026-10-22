import * as vscode from 'vscode';
import { ActionsPanel } from './webview/host/ActionsPanel';
import { ComponentsViewProvider } from './views/ComponentsView';
import { WorkflowDiscovery } from './workflows/discovery';
import { WorkflowFileTreeItem, WorkflowJobTreeItem, WorkflowsViewProvider } from './views/WorkflowsView';

export function activate(context: vscode.ExtensionContext): void {
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
      if (item?.workflow) {
        vscode.window.showInformationMessage(`Run initiated for workflow: ${item.workflow.name}`);
      }
    }),

    vscode.commands.registerCommand('localActions.runJob', async (item?: WorkflowJobTreeItem) => {
      if (item?.job) {
        vscode.window.showInformationMessage(`Run initiated for job: ${item.job.name}`);
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
