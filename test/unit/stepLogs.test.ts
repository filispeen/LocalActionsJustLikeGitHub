import { describe, expect, it } from 'vitest';
import { cleanLogLine, extractStepsFromLogs, partitionJobLogs } from '../../src/webview/app/stepLogs';
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

  it('correctly extracts steps and partitions all lines without dropping any for run-1792705337566.log', () => {
    const realLogLines = [
      "Couldn't get a valid docker connection: no DOCKER_HOST and an invalid container socket ''",
      '[Build and Publish Experimental] ⭐ Run Set up job',
      '[Build and Publish Experimental]   ✅  Success - Set up job',
      "[Build and Publish Experimental]   |   ☁  git clone 'https://github.com/actions/cache' # ref=v4",
      "[Build and Publish Experimental]   |   ☁  git clone 'https://github.com/actions/upload-artifact' # ref=v4",
      "[Build and Publish Experimental]   |   ☁  git clone 'https://github.com/softprops/action-gh-release' # ref=v2",
      '[Build and Publish Experimental] ⭐ Run Main Checkout repository',
      '[Build and Publish Experimental]   ✅  Success - Checkout repository [8588ms]',
      '[Build and Publish Experimental] ⭐ Run Main Cache NVIDIA DLSS SDK',
      '[Build and Publish Experimental]   | (node:18868) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.',
      '',
      '[Build and Publish Experimental]   | (Use `node --trace-deprecation ...` to show where the warning was created)',
      '',
      '[Build and Publish Experimental]   | Cache not found for input keys: dlss-sdk-Windows-v1, dlss-sdk-Windows-',
      '',
      '[Build and Publish Experimental]   ✅  Success - Cache NVIDIA DLSS SDK [1577ms]',
      '[Build and Publish Experimental] ⭐ Run Main Clone NVIDIA DLSS SDK',
      '[Build and Publish Experimental]   | Cannot find: pwsh in PATH',
      '',
      '[Build and Publish Experimental]   ❌  Failure - Clone NVIDIA DLSS SDK [57ms]',
      '[Build and Publish Experimental]   | Cannot find: pwsh in PATH',
      '[Build and Publish Experimental] ⭐ Run Complete job',
      '[Build and Publish Experimental]   ✅  Success - Complete job',
      '[Build and Publish Experimental]   🏁  Job failed',
      "Error: Job 'Build and Publish Experimental' failed"
    ];

    const extracted = extractStepsFromLogs(realLogLines);
    expect(extracted).toHaveLength(5);
    expect(extracted.map((s) => s.name)).toEqual([
      'Set up job',
      'Checkout repository',
      'Cache NVIDIA DLSS SDK',
      'Clone NVIDIA DLSS SDK',
      'Complete job'
    ]);
    expect(extracted[3].status).toBe('failure');
    expect(extracted[3].durationMs).toBe(57);
    expect(extracted[4].status).toBe('success');

    const partitioned = partitionJobLogs(realLogLines, 'Build and Publish Experimental', extracted);

    expect(partitioned['Set up job']).toHaveLength(6);
    expect(partitioned['Set up job'][0]).toContain("Couldn't get a valid docker connection");
    expect(partitioned['Set up job'][3]).toContain("git clone 'https://github.com/actions/cache'");

    expect(partitioned['Checkout repository']).toHaveLength(2);
    expect(partitioned['Cache NVIDIA DLSS SDK']).toHaveLength(8);

    expect(partitioned['Clone NVIDIA DLSS SDK']).toHaveLength(5);
    expect(partitioned['Clone NVIDIA DLSS SDK'][4]).toContain('Cannot find: pwsh in PATH');

    expect(partitioned['Complete job']).toHaveLength(4);
    expect(partitioned['Complete job'][2]).toContain('🏁  Job failed');
    expect(partitioned['Complete job'][3]).toContain("Error: Job 'Build and Publish Experimental' failed");

    const totalLinesInSteps = Object.values(partitioned).reduce((sum, arr) => sum + arr.length, 0);
    expect(totalLinesInSteps).toBe(realLogLines.length);
  });
});
