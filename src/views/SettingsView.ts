import * as vscode from 'vscode';
import { SecretsManager } from '../settings/secrets';

export type SettingsTreeElement = SettingsCategoryItem | SettingsLeafItem;

export class SettingsCategoryItem extends vscode.TreeItem {
  constructor(
    public readonly categoryId: 'secrets' | 'variables' | 'runners' | 'options',
    public readonly label: string,
    public readonly count?: number
  ) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);
    this.id = `category-${categoryId}`;
    if (count !== undefined) {
      this.description = String(count);
    }
    this.contextValue = `category_${categoryId}`;
  }
}

export class SettingsLeafItem extends vscode.TreeItem {
  constructor(
    public readonly leafType: 'secret' | 'variable' | 'runner' | 'option',
    public readonly keyName: string,
    public readonly displayValue: string,
    public readonly icon: string
  ) {
    super(keyName, vscode.TreeItemCollapsibleState.None);
    this.id = `leaf-${leafType}-${keyName}`;
    this.description = displayValue;
    this.iconPath = new vscode.ThemeIcon(icon);
    this.contextValue = `leaf_${leafType}`;
  }
}

export class SettingsViewProvider implements vscode.TreeDataProvider<SettingsTreeElement> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<SettingsTreeElement | undefined | void>();
  public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly secretsManager: SecretsManager) {
    this.secretsManager.onDidChangeSecrets(() => {
      this._onDidChangeTreeData.fire();
    });
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public getTreeItem(element: SettingsTreeElement): vscode.TreeItem {
    return element;
  }

  public async getChildren(element?: SettingsTreeElement): Promise<SettingsTreeElement[]> {
    if (!element) {
      const secretKeys = this.secretsManager.getSecretKeys();
      const config = vscode.workspace.getConfiguration('localActions');
      const variables = config.get<Record<string, string>>('variables') || {};
      const runners = config.get<Record<string, string>>('runners') || {};

      return [
        new SettingsCategoryItem('secrets', 'Secrets', secretKeys.length),
        new SettingsCategoryItem('variables', 'Variables', Object.keys(variables).length),
        new SettingsCategoryItem('runners', 'Runners', Object.keys(runners).length + 1),
        new SettingsCategoryItem('options', 'Options')
      ];
    }

    if (element instanceof SettingsCategoryItem) {
      const config = vscode.workspace.getConfiguration('localActions');

      switch (element.categoryId) {
        case 'secrets': {
          const keys = this.secretsManager.getSecretKeys();
          return keys.map(
            (k) => new SettingsLeafItem('secret', k, '••••••••', 'key')
          );
        }

        case 'variables': {
          const vars = config.get<Record<string, string>>('variables') || {};
          return Object.entries(vars).map(
            ([k, v]) => new SettingsLeafItem('variable', k, v, 'symbol-variable')
          );
        }

        case 'runners': {
          const useHost = config.get<boolean>('useHostRunner', true);
          const runners = config.get<Record<string, string>>('runners') || {};

          const items: SettingsLeafItem[] = [
            new SettingsLeafItem('runner', 'Host Runner', useHost ? 'Enabled' : 'Disabled', 'server')
          ];
          for (const [platform, img] of Object.entries(runners)) {
            items.push(new SettingsLeafItem('runner', platform, img, 'vm'));
          }
          return items;
        }

        case 'options': {
          const retention = config.get<number>('historyRetention', 50);
          const noCache = config.get<boolean>('noCacheServer', false);
          const artifactPath = config.get<string>('artifactServerPath', '');

          return [
            new SettingsLeafItem('option', 'History Retention', `${retention} runs`, 'history'),
            new SettingsLeafItem('option', 'Cache Server', noCache ? 'Disabled' : 'Enabled', 'archive'),
            new SettingsLeafItem(
              'option',
              'Artifact Server Path',
              artifactPath.trim().length > 0 ? artifactPath : 'Default',
              'file-zip'
            )
          ];
        }
      }
    }

    return [];
  }
}
