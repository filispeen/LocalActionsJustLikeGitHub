import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { redactSecrets } from '../../src/act/parser';
import { RunStore } from '../../src/runs/store';
import { WorkflowRun } from '../../src/runs/types';

describe('Secret Redaction Verification', () => {
  let tempDir: string;
  let store: RunStore;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'act-redact-test-'));
    store = new RunStore(tempDir);
    await store.init();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('redacts multiple secrets of varying lengths', () => {
    const secrets = ['super_secret_token_123', 'short_secret', 'another'];
    const logLine = 'Connecting with token=super_secret_token_123 and another=another and short_secret';
    const result = redactSecrets(logLine, secrets);

    expect(result).toBe('Connecting with token=*** and ***=*** and ***');
    expect(result).not.toContain('super_secret_token_123');
    expect(result).not.toContain('short_secret');
    expect(result).not.toContain('another');
  });

  it('ensures secret values are never written to disk in RunStore logs', async () => {
    const secrets = ['ghp_1234567890abcdefghijklmnopqrstuvwxyz'];
    const run: WorkflowRun = {
      id: 'run-redact-check',
      workflowFilePath: '.github/workflows/check.yml',
      workflowName: 'Check',
      event: 'push',
      status: 'success',
      startedAt: new Date().toISOString(),
      trigger: 'push',
      jobs: []
    };

    await store.saveRun(run);
    await store.appendLog('run-redact-check', 'curl -H "Authorization: token ghp_1234567890abcdefghijklmnopqrstuvwxyz" https://api.github.com', secrets);

    const logFromFile = await store.getLog('run-redact-check');
    expect(logFromFile).toContain('curl -H "Authorization: token ***" https://api.github.com');
    expect(logFromFile).not.toContain('ghp_1234567890abcdefghijklmnopqrstuvwxyz');

    const rawFile = await fs.readFile(path.join(tempDir, 'runs', 'run-redact-check.log'), 'utf8');
    expect(rawFile).not.toContain('ghp_1234567890abcdefghijklmnopqrstuvwxyz');
  });
});
