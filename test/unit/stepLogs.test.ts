import { describe, expect, it } from 'vitest';
import { cleanLogLine, partitionJobLogs } from '../../src/webview/app/stepLogs';
import { RunStep } from '../../src/runs/types';

describe('stepLogs', () => {
  it('cleans job and pipe prefixes', () => {
    expect(cleanLogLine('[build]   | echo hello', 'build')).toBe('echo hello');
    expect(cleanLogLine('[build] | echo hello', 'build')).toBe('echo hello');
    expect(cleanLogLine('[test]   | npm test')).toBe('npm test');
  });

  it('partitions logs by steps', () => {
    const steps: RunStep[] = [
      { id: 'setup', name: 'Set up Node', status: 'success', logLinesCount: 2 },
      { id: 'test', name: 'Run tests', status: 'success', logLinesCount: 3 }
    ];

    const lines = [
      '[test/job] ⭐ Run Set up Node',
      '[test/job]   | Node v20.0.0',
      '[test/job]   ✅  Success - Set up Node [10ms]',
      '[test/job] ⭐ Run Run tests',
      '[test/job]   | vitest',
      '[test/job]   | 57 passed',
      '[test/job]   ✅  Success - Run tests [50ms]'
    ];

    const partitioned = partitionJobLogs(lines, 'job', steps);

    expect(partitioned.setup).toHaveLength(3);
    expect(partitioned.setup[0]).toContain('Set up Node');
    expect(partitioned.setup[1]).toContain('Node v20.0.0');

    expect(partitioned.test).toHaveLength(4);
    expect(partitioned.test[0]).toContain('Run tests');
    expect(partitioned.test[2]).toContain('57 passed');
  });

  it('falls back to all lines when single step with no markers', () => {
    const steps: RunStep[] = [
      { id: 'only', name: 'Single step', status: 'success', logLinesCount: 1 }
    ];

    const lines = ['Plain output line 1', 'Plain output line 2'];
    const partitioned = partitionJobLogs(lines, 'job', steps);

    expect(partitioned.only).toEqual(lines);
  });
});
