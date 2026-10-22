import * as crypto from 'node:crypto';
import * as vscode from 'vscode';
import { WebviewToHostMessage } from '../../shared/messages';

export class ActionsPanel {
  public static currentPanel: ActionsPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];

  public static render(extensionUri: vscode.Uri): ActionsPanel {
    if (ActionsPanel.currentPanel) {
      ActionsPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
      return ActionsPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'localActionsPage',
      'Local Actions',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: false,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist', 'webview')]
      }
    );

    ActionsPanel.currentPanel = new ActionsPanel(panel, extensionUri);
    return ActionsPanel.currentPanel;
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      (message: unknown) => {
        if (this.isValidMessage(message)) {
          this.handleMessage(message);
        }
      },
      null,
      this.disposables
    );

    this.panel.webview.html = this.getHtmlForWebview(this.panel.webview);
  }

  private isValidMessage(message: unknown): message is WebviewToHostMessage {
    if (typeof message !== 'object' || message === null) {
      return false;
    }
    const candidate = message as Record<string, unknown>;
    return candidate.type === 'ready';
  }

  private handleMessage(message: WebviewToHostMessage): void {
    if (message.type === 'ready') {
      this.panel.webview.postMessage({ type: 'init' });
    }
  }

  public dispose(): void {
    ActionsPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const webviewDistUri = vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview');
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewDistUri, 'index.js'));
    const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewDistUri, 'index.css'));
    const nonce = crypto.randomBytes(16).toString('base64');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${stylesUri}">
  <title>Local Actions</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
