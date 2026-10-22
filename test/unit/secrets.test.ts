import { describe, expect, it } from 'vitest';
import { SecretsManager } from '../../src/settings/secrets';

class MockSecretStorage {
  private readonly map = new Map<string, string>();

  public async get(key: string): Promise<string | undefined> {
    return this.map.get(key);
  }

  public async store(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }

  public async delete(key: string): Promise<void> {
    this.map.delete(key);
  }

  public onDidChange = () => ({ dispose: () => {} });
}

class MockMemento {
  private readonly map = new Map<string, unknown>();

  public get<T>(key: string, defaultValue?: T): T {
    if (this.map.has(key)) {
      return this.map.get(key) as T;
    }
    return defaultValue as T;
  }

  public async update(key: string, value: unknown): Promise<void> {
    this.map.set(key, value);
  }

  public keys(): readonly string[] {
    return Array.from(this.map.keys());
  }

  public setKeysForSync(): void {}
}

describe('SecretsManager', () => {
  it('stores, retrieves and deletes secrets', async () => {
    const mockStorage = new MockSecretStorage();
    const mockMemento = new MockMemento();
    const manager = new SecretsManager(mockStorage as never, mockMemento as never);

    await manager.setSecret('API_KEY', 'secret_value_123');
    expect(manager.getSecretKeys()).toEqual(['API_KEY']);

    const retrieved = await manager.getSecret('API_KEY');
    expect(retrieved).toBe('secret_value_123');

    const all = await manager.getAllSecrets();
    expect(all).toEqual({ API_KEY: 'secret_value_123' });

    await manager.deleteSecret('API_KEY');
    expect(manager.getSecretKeys()).toEqual([]);
    expect(await manager.getSecret('API_KEY')).toBeUndefined();
  });
});
