import * as crypto from 'node:crypto';
import * as vscode from 'vscode';
import { RunStore } from '../../runs/store';
import { WorkflowRun } from '../../runs/types';
import { HostToWebviewMessage, WebviewToHostMessage } from '../../shared/messages';
import { WorkflowDiscovery } from '../../workflows/discovery';

export type RunWorkflowHandler = (workflowFilePath: string) => Promise<void>;
export type CancelRunHandler = (runId: string) => Promise<void>;

export class ActionsPanel {
  public static currentPanel: ActionsPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly store: RunStore;
  private readonly discovery: WorkflowDiscovery;
  private readonly onRunWorkflow: RunWorkflowHandler;
  private readonly onCancelRun: CancelRunHandler;
  private disposables: vscode.Disposable[] = [];

  public static render(
    extensionUri: vscode.Uri,
    store: RunStore,
    discovery: WorkflowDiscovery,
    onRunWorkflow: RunWorkflowHandler,
    onCancelRun: CancelRunHandler
  ): ActionsPanel {
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

    ActionsPanel.currentPanel = new ActionsPanel(
      panel,
      extensionUri,
      store,
      discovery,
      onRunWorkflow,
      onCancelRun
    );
    return ActionsPanel.currentPanel;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    store: RunStore,
    discovery: WorkflowDiscovery,
    onRunWorkflow: RunWorkflowHandler,
    onCancelRun: CancelRunHandler
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.store = store;
    this.discovery = discovery;
    this.onRunWorkflow = onRunWorkflow;
    this.onCancelRun = onCancelRun;

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

    const storeDispose = this.store.onDidChangeRuns(() => {
      this.postMessage({
        type: 'runsUpdated',
        runs: this.store.getCachedRuns()
      });
    });
    this.disposables.push(storeDispose);

    const logDispose = this.store.onDidAppendLog((runId, line) => {
      this.postMessage({
        type: 'logAppended',
        runId,
        line
      });
    });
    this.disposables.push(logDispose);

    const wfDispose = this.discovery.onDidChangeWorkflows(() => {
      this.postMessage({
        type: 'workflowsUpdated',
        workflows: this.discovery.getWorkflows()
      });
    });
    this.disposables.push({ dispose: () => wfDispose.dispose() });

    this.panel.webview.html = this.getHtmlForWebview(this.panel.webview);
  }

  public postRunUpdated(run: WorkflowRun): void {
    this.postMessage({
      type: 'runUpdated',
      run
    });
  }

  public postMessage(message: HostToWebviewMessage): void {
    this.panel.webview.postMessage(message);
  }

  private isValidMessage(message: unknown): message is WebviewToHostMessage {
    if (typeof message !== 'object' || message === null) {
      return false;
    }
    const candidate = message as Record<string, unknown>;
    const validTypes = ['ready', 'runWorkflow', 'cancelRun', 'deleteRun', 'openWorkflowFile', 'requestLog'];
    return typeof candidate.type === 'string' && validTypes.includes(candidate.type);
  }

  private async handleMessage(message: WebviewToHostMessage): Promise<void> {
    switch (message.type) {
      case 'ready':
        this.postMessage({
          type: 'init',
          runs: await this.store.getRuns(),
          workflows: this.discovery.getWorkflows()
        });
        break;

      case 'runWorkflow':
        await this.onRunWorkflow(message.workflowFilePath);
        break;

      case 'cancelRun':
        await this.onCancelRun(message.runId);
        break;

      case 'deleteRun':
        await this.store.deleteRun(message.runId);
        break;

      case 'openWorkflowFile': {
        const doc = await vscode.workspace.openTextDocument(message.filePath);
        await vscode.window.showTextDocument(doc);
        break;
      }

      case 'requestLog': {
        const log = await this.store.getLog(message.runId);
        this.postMessage({
          type: 'logChunk',
          runId: message.runId,
          log
        });
        break;
      }
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
<body style="padding: 0; margin: 0; background-color: var(--color-canvas-default, #0d1117); color: var(--color-fg-default, #c9d1d9);">
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
