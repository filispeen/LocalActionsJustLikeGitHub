import * as vscode from 'vscode';
import { ActStatus, DockerStatus, detectAct, detectDocker } from '../act/detection';

export class ComponentItem extends vscode.TreeItem {
  constructor(
    public readonly id: string,
    public readonly label: string,
    public readonly description: string,
    public readonly tooltip: string,
    public readonly iconPath: vscode.ThemeIcon,
    public readonly command?: vscode.Command
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = description;
    this.tooltip = tooltip;
    this.iconPath = iconPath;
    this.command = command;
  }
}

export class ComponentsViewProvider implements vscode.TreeDataProvider<ComponentItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<ComponentItem | undefined | void>();
  public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private actStatus: ActStatus | undefined;
  private dockerStatus: DockerStatus | undefined;

  public async refresh(): Promise<void> {
    const config = vscode.workspace.getConfiguration('localActions');
    const actPath = config.get<string>('actPath');

    const [act, docker] = await Promise.all([
      detectAct(actPath),
      detectDocker()
    ]);

    this.actStatus = act;
    this.dockerStatus = docker;
    this._onDidChangeTreeData.fire();
  }

  public getTreeItem(element: ComponentItem): vscode.TreeItem {
    return element;
  }

  public async getChildren(): Promise<ComponentItem[]> {
    if (!this.actStatus || !this.dockerStatus) {
      await this.refresh();
    }

    const items: ComponentItem[] = [];

    if (this.actStatus) {
      if (this.actStatus.installed) {
        items.push(
          new ComponentItem(
            'act',
            'act',
            this.actStatus.version ? `v${this.actStatus.version}` : 'Installed',
            `act CLI: ${this.actStatus.path}\nVersion: ${this.actStatus.version ?? 'unknown'}`,
            new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'))
          )
        );
      } else {
        items.push(
          new ComponentItem(
            'act',
            'act',
            'Not found',
            `act was not found (${this.actStatus.error ?? 'missing'}). Click to view install options.`,
            new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed')),
            {
              command: 'localActions.openActInstallGuide',
              title: 'Install Guidance'
            }
          )
        );
      }
    }

    if (this.dockerStatus) {
      if (this.dockerStatus.installed && this.dockerStatus.running) {
        items.push(
          new ComponentItem(
            'docker',
            'Docker',
            this.dockerStatus.version ? `Running (${this.dockerStatus.version})` : 'Running',
            'Docker daemon is reachable and ready.',
            new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'))
          )
        );
      } else if (this.dockerStatus.installed && !this.dockerStatus.running) {
        items.push(
          new ComponentItem(
            'docker',
            'Docker',
            'Daemon not running',
            'Docker CLI is installed, but the Docker daemon is not reachable. Click for guidance.',
            new vscode.ThemeIcon('warning', new vscode.ThemeColor('problemsWarningIcon.foreground')),
            {
              command: 'localActions.openDockerGuide',
              title: 'Docker Guidance'
            }
          )
        );
      } else {
        items.push(
          new ComponentItem(
            'docker',
            'Docker',
            'Not installed (optional)',
            'Docker is optional for host runners, but required for container runners. Click for guidance.',
            new vscode.ThemeIcon('info', new vscode.ThemeColor('descriptionForeground')),
            {
              command: 'localActions.openDockerGuide',
              title: 'Docker Guidance'
            }
          )
        );
      }
    }

    return items;
  }
}
