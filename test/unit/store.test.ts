import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RunStore } from '../../src/runs/store';
import { WorkflowRun } from '../../src/runs/types';

describe('RunStore', () => {
  let tempDir: string;
  let store: RunStore;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'act-store-test-'));
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

  const createMockRun = (id: string, name: string): WorkflowRun => ({
    id,
    workflowFilePath: `.github/workflows/${name}.yml`,
    workflowName: name,
    event: 'push',
    status: 'success',
    startedAt: new Date().toISOString(),
    trigger: 'push',
    jobs: []
  });

  it('saves and retrieves runs', async () => {
    const run1 = createMockRun('run-1', 'Build');
    await store.saveRun(run1);

    const runs = await store.getRuns();
    expect(runs.length).toBe(1);
    expect(runs[0].id).toBe('run-1');

    const fetched = store.getRun('run-1');
    expect(fetched).toBeDefined();
    expect(fetched?.workflowName).toBe('Build');
  });

  it('updates existing run in store', async () => {
    const run = createMockRun('run-1', 'Build');
    await store.saveRun(run);

    run.status = 'failure';
    await store.saveRun(run);

    const runs = await store.getRuns();
    expect(runs.length).toBe(1);
    expect(runs[0].status).toBe('failure');
  });

  it('prunes runs exceeding max retention', async () => {
    for (let i = 1; i <= 5; i++) {
      await store.saveRun(createMockRun(`run-${i}`, `Job-${i}`), 3);
    }

    const runs = await store.getRuns();
    expect(runs.length).toBe(3);
    expect(runs[0].id).toBe('run-5');
    expect(runs[1].id).toBe('run-4');
    expect(runs[2].id).toBe('run-3');
  });

  it('appends and reads logs with secret redaction', async () => {
    await store.saveRun(createMockRun('run-log', 'LogTest'));
    await store.appendLog('run-log', 'Starting task with secret_token_xyz', ['secret_token_xyz']);
    await store.appendLog('run-log', 'Completed successfully');

    const log = await store.getLog('run-log');
    expect(log).toContain('Starting task with ***');
    expect(log).toContain('Completed successfully');
    expect(log).not.toContain('secret_token_xyz');
  });

  it('deletes a run and its log file', async () => {
    await store.saveRun(createMockRun('run-del', 'DeleteTest'));
    await store.appendLog('run-del', 'Some log');

    await store.deleteRun('run-del');
    const runs = await store.getRuns();
    expect(runs.length).toBe(0);

    const log = await store.getLog('run-del');
    expect(log).toBe('');
  });

  it('clears all runs', async () => {
    await store.saveRun(createMockRun('run-a', 'A'));
    await store.saveRun(createMockRun('run-b', 'B'));

    await store.clear();
    const runs = await store.getRuns();
    expect(runs.length).toBe(0);
  });
});
