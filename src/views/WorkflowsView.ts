import * as vscode from 'vscode';
import { WorkflowDiscovery } from '../workflows/discovery';
import { ParsedWorkflow, WorkflowJob } from '../workflows/types';

export type WorkflowTreeElement = WorkflowFileTreeItem | WorkflowJobTreeItem;

export class WorkflowFileTreeItem extends vscode.TreeItem {
  constructor(public readonly workflow: ParsedWorkflow) {
    super(
      workflow.name,
      workflow.jobs.length > 0
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    this.id = workflow.filePath;
    if (workflow.isValid) {
      this.description = workflow.events.join(', ');
      this.tooltip = `${workflow.fileName}\nPath: ${workflow.filePath}\nEvents: ${workflow.events.join(', ')}\nJobs: ${workflow.jobs.length}`;
      this.iconPath = new vscode.ThemeIcon('play-circle');
      this.contextValue = 'workflowItem';
    } else {
      this.description = 'Invalid YAML';
      this.tooltip = `Error in ${workflow.fileName}: ${workflow.error}`;
      this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('problemsWarningIcon.foreground'));
      this.contextValue = 'invalidWorkflowItem';
    }
  }
}

export class WorkflowJobTreeItem extends vscode.TreeItem {
  constructor(
    public readonly workflow: ParsedWorkflow,
    public readonly job: WorkflowJob
  ) {
    super(job.name, vscode.TreeItemCollapsibleState.None);
    this.id = `${workflow.filePath}#${job.id}`;

    const runsOnStr = Array.isArray(job.runsOn) ? job.runsOn.join(', ') : job.runsOn;
    const parts: string[] = [];
    if (runsOnStr) {
      parts.push(runsOnStr);
    }
    if (job.hasMatrix) {
      parts.push('[matrix]');
    }
    this.description = parts.join(' ');

    const needsStr = job.needs.length > 0 ? job.needs.join(', ') : 'none';
    this.tooltip = `Job: ${job.id}\nNeeds: ${needsStr}`;
    this.iconPath = new vscode.ThemeIcon('symbol-event');
    this.contextValue = 'jobItem';
  }
}

export class WorkflowsViewProvider implements vscode.TreeDataProvider<WorkflowTreeElement> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<WorkflowTreeElement | undefined | void>();
  public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly discovery: WorkflowDiscovery) {
    this.discovery.onDidChangeWorkflows(() => {
      this._onDidChangeTreeData.fire();
    });
  }

  public refresh(): Promise<ParsedWorkflow[]> {
    return this.discovery.scan();
  }

  public getTreeItem(element: WorkflowTreeElement): vscode.TreeItem {
    return element;
  }

  public async getChildren(element?: WorkflowTreeElement): Promise<WorkflowTreeElement[]> {
    if (!element) {
      const workflows = this.discovery.getWorkflows();
      return workflows.map((wf) => new WorkflowFileTreeItem(wf));
    }

    if (element instanceof WorkflowFileTreeItem) {
      return element.workflow.jobs.map((job) => new WorkflowJobTreeItem(element.workflow, job));
    }

    return [];
  }
}
