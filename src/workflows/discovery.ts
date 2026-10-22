import * as vscode from 'vscode';
import { parseWorkflowYaml } from './parser';
import { ParsedWorkflow } from './types';

export class WorkflowDiscovery {
  private workflows: ParsedWorkflow[] = [];
  private readonly _onDidChangeWorkflows = new vscode.EventEmitter<void>();
  public readonly onDidChangeWorkflows = this._onDidChangeWorkflows.event;

  public async scan(): Promise<ParsedWorkflow[]> {
    const folders = vscode.workspace.workspaceFolders;
    const files: vscode.Uri[] = [];

    if (folders && folders.length > 0) {
      for (const folder of folders) {
        const pattern = new vscode.RelativePattern(folder, '.github/workflows/*.{yml,yaml}');
        const found = await vscode.workspace.findFiles(pattern, '**/{node_modules,.git}/**');
        files.push(...found);
      }
    } else {
      const found = await vscode.workspace.findFiles('.github/workflows/*.{yml,yaml}', '**/{node_modules,.git}/**');
      files.push(...found);
    }

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
    const folders = vscode.workspace.workspaceFolders;
    const disposables: vscode.Disposable[] = [];

    const reload = () => {
      this.scan();
    };

    if (folders && folders.length > 0) {
      for (const folder of folders) {
        const pattern = new vscode.RelativePattern(folder, '.github/workflows/*.{yml,yaml}');
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        disposables.push(
          watcher.onDidCreate(reload),
          watcher.onDidChange(reload),
          watcher.onDidDelete(reload),
          watcher
        );
      }
    } else {
      const watcher = vscode.workspace.createFileSystemWatcher('.github/workflows/*.{yml,yaml}');
      disposables.push(
        watcher.onDidCreate(reload),
        watcher.onDidChange(reload),
        watcher.onDidDelete(reload),
        watcher
      );
    }

    return {
      dispose: () => {
        for (const d of disposables) {
          d.dispose();
        }
      }
    };
  }
}
