export interface SecretStorageLike {
  get(key: string): Promise<string | undefined> | Thenable<string | undefined>;
  store(key: string, value: string): Promise<void> | Thenable<void>;
  delete(key: string): Promise<void> | Thenable<void>;
}

export interface MementoLike {
  get<T>(key: string, defaultValue?: T): T;
  update(key: string, value: unknown): Promise<void> | Thenable<void>;
}

export class SecretsManager {
  private static readonly KEYS_LIST_KEY = 'localActions.secretKeys';
  private readonly listeners: Array<() => void> = [];

  constructor(
    private readonly secretStorage: SecretStorageLike,
    private readonly workspaceState: MementoLike,
    private readonly workspacePrefix?: string
  ) {}

  private getStorageKey(key: string): string {
    return this.workspacePrefix ? `${this.workspacePrefix}:${key}` : key;
  }

  public onDidChangeSecrets(listener: () => void): { dispose: () => void } {
    this.listeners.push(listener);
    return {
      dispose: () => {
        const idx = this.listeners.indexOf(listener);
        if (idx !== -1) {
          this.listeners.splice(idx, 1);
        }
      }
    };
  }

  private notifyChange(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public async getSecret(key: string): Promise<string | undefined> {
    return this.secretStorage.get(this.getStorageKey(key));
  }

  public async setSecret(key: string, value: string): Promise<void> {
    await this.secretStorage.store(this.getStorageKey(key), value);
    const keys = this.getSecretKeys();
    if (!keys.includes(key)) {
      keys.push(key);
      await this.workspaceState.update(SecretsManager.KEYS_LIST_KEY, keys);
    }
    this.notifyChange();
  }

  public async deleteSecret(key: string): Promise<void> {
    await this.secretStorage.delete(this.getStorageKey(key));
    const keys = this.getSecretKeys().filter((k) => k !== key);
    await this.workspaceState.update(SecretsManager.KEYS_LIST_KEY, keys);
    this.notifyChange();
  }

  public getSecretKeys(): string[] {
    return this.workspaceState.get<string[]>(SecretsManager.KEYS_LIST_KEY, []);
  }

  public async getAllSecrets(): Promise<Record<string, string>> {
    const keys = this.getSecretKeys();
    const result: Record<string, string> = {};
    for (const key of keys) {
      const val = await this.secretStorage.get(this.getStorageKey(key));
      if (val !== undefined) {
        result[key] = val;
      }
    }
    return result;
  }
}
