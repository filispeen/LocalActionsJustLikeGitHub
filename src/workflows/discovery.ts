import * as vscode from 'vscode';
import { parseWorkflowYaml } from './parser';
import { ParsedWorkflow } from './types';

export class WorkflowDiscovery {
  private workflows: ParsedWorkflow[] = [];
  private readonly _onDidChangeWorkflows = new vscode.EventEmitter<void>();
  public readonly onDidChangeWorkflows = this._onDidChangeWorkflows.event;

  public async scan(): Promise<ParsedWorkflow[]> {
    const files = await vscode.workspace.findFiles('**/.github/workflows/*.{yml,yaml}');
    const results: ParsedWorkflow[] = [];

    for (const fileUri of files) {
      try {
        const fileBytes = await vscode.workspace.fs.readFile(fileUri);
        const content = Buffer.from(fileBytes).toString('utf8');
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
        const folderUri = workspaceFolder ? workspaceFolder.uri.toString() : '';
        const parsed = parseWorkflowYaml(content, fileUri.fsPath, folderUri);
        results.push(parsed);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
        results.push({
          filePath: fileUri.fsPath,
          fileName: fileUri.fsPath.split(/[/\\]/).pop() ?? fileUri.fsPath,
          workspaceFolderUri: workspaceFolder ? workspaceFolder.uri.toString() : '',
          isValid: false,
          error: message,
          name: fileUri.fsPath.split(/[/\\]/).pop() ?? fileUri.fsPath,
          events: [],
          inputs: [],
          jobs: []
        });
      }
    }

    this.workflows = results;
    this._onDidChangeWorkflows.fire();
    return this.workflows;
  }

  public getWorkflows(): ParsedWorkflow[] {
    return this.workflows;
  }

  public registerWatcher(): vscode.Disposable {
    const watcher = vscode.workspace.createFileSystemWatcher('**/.github/workflows/*.{yml,yaml}');

    const reload = () => {
      this.scan();
    };

    const d1 = watcher.onDidCreate(reload);
    const d2 = watcher.onDidChange(reload);
    const d3 = watcher.onDidDelete(reload);

    return {
      dispose: () => {
        d1.dispose();
        d2.dispose();
        d3.dispose();
        watcher.dispose();
      }
    };
  }
}
