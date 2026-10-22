import * as vscode from 'vscode';
import { ActionsPanel } from './webview/host/ActionsPanel';
import { ComponentsViewProvider } from './views/ComponentsView';

export function activate(context: vscode.ExtensionContext): void {
  const componentsProvider = new ComponentsViewProvider();
  vscode.window.registerTreeDataProvider('localActions.componentsView', componentsProvider);

  context.subscriptions.push(
    vscode.commands.registerCommand('localActions.openActionsPage', () => {
      ActionsPanel.render(context.extensionUri);
    }),

    vscode.commands.registerCommand('localActions.refreshComponents', () => {
      return componentsProvider.refresh();
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
}

export function deactivate(): void {
  if (ActionsPanel.currentPanel) {
    ActionsPanel.currentPanel.dispose();
  }
}
