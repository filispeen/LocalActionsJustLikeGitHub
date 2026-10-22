import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ActRunner } from '../../src/act/runner';
import { RunStore } from '../../src/runs/store';
import { WorkflowRun } from '../../src/runs/types';

describe('ActRunner with real execution', () => {
  let tempDir: string;
  let store: RunStore;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'act-runner-test-'));
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

  it('executes a workflow locally and records job and step statuses', async () => {
    const actPath = process.env.ACT_PATH ?? 'act';
    const cwd = process.cwd();
    const workflowPath = path.join(cwd, 'test', 'fixtures', 'workflows', 'host.yml');

    const run: WorkflowRun = {
      id: 'test-run-real-1',
      workflowFilePath: workflowPath,
      workflowName: 'Test Host',
      event: 'push',
      status: 'queued',
      startedAt: new Date().toISOString(),
      trigger: 'manual',
      jobs: []
    };

    const runner = new ActRunner(
      actPath,
      cwd,
      run,
      {
        workflowPath,
        useHostRunner: true,
        jsonOutput: true
      },
      [],
      store
    );

    const result = await runner.start();
    expect(result.status).toBe('success');
    expect(result.jobs.length).toBeGreaterThan(0);

    const buildJob = result.jobs.find((j) => j.id === 'build' || j.name.includes('Build Job'));
    expect(buildJob).toBeDefined();
    expect(buildJob?.status).toBe('success');

    const stepOne = buildJob?.steps.find((s) => s.name === 'Step One');
    expect(stepOne).toBeDefined();
    expect(stepOne?.status).toBe('success');

    const log = await store.getLog('test-run-real-1');
    expect(log).toContain('Hello world');
    expect(log).toContain('Second step');
  }, 20000);
});
