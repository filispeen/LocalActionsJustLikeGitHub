import * as vscode from 'vscode';
import { ActionsPanel } from './webview/host/ActionsPanel';

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand('localActions.openActionsPage', () => {
    ActionsPanel.render(context.extensionUri);
  });

  context.subscriptions.push(disposable);
}

export function deactivate(): void {
  if (ActionsPanel.currentPanel) {
    ActionsPanel.currentPanel.dispose();
  }
}
