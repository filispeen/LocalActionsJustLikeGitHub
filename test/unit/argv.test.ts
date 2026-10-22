import { describe, expect, it } from 'vitest';
import { buildActArgv } from '../../src/act/argv';

describe('buildActArgv', () => {
  it('builds minimal argv with default json output', () => {
    const argv = buildActArgv({});
    expect(argv).toEqual(['--json']);
  });

  it('builds full argv with workflow, job, event and settings', () => {
    const argv = buildActArgv({
      event: 'workflow_dispatch',
      workflowPath: '.github/workflows/deploy.yml',
      jobId: 'deploy',
      eventPayloadPath: '/tmp/payload.json',
      secrets: { API_KEY: 'secret123', TOKEN: 'abc' },
      secretFile: '.secrets',
      variables: { VAR_ONE: 'hello' },
      varFile: '.vars',
      inputs: { env: 'production' },
      inputFile: '.input',
      platforms: { 'ubuntu-latest': 'catthehacker/ubuntu:act-latest' },
      dryrun: true,
      jsonOutput: true,
      extraArgs: ['--verbose']
    });

    expect(argv).toContain('workflow_dispatch');
    expect(argv).toEqual(
      expect.arrayContaining([
        '-W',
        '.github/workflows/deploy.yml',
        '-j',
        'deploy',
        '-e',
        '/tmp/payload.json',
        '-s',
        'API_KEY=secret123',
        '-s',
        'TOKEN=abc',
        '--secret-file',
        '.secrets',
        '--var',
        'VAR_ONE=hello',
        '--var-file',
        '.vars',
        '--input',
        'env=production',
        '--input-file',
        '.input',
        '-P',
        'ubuntu-latest=catthehacker/ubuntu:act-latest',
        '-n',
        '--json',
        '--verbose'
      ])
    );
  });

  it('adds host runner platform mapping when useHostRunner is true', () => {
    const argv = buildActArgv({
      useHostRunner: true
    });
    expect(argv).toContain('-P');
    expect(argv).toContain('ubuntu-latest=-self-hosted');
  });

  it('preserves existing ubuntu-latest mapping when useHostRunner is true', () => {
    const argv = buildActArgv({
      useHostRunner: true,
      platforms: {
        'ubuntu-latest': 'my-custom-image'
      }
    });
    expect(argv).toContain('ubuntu-latest=my-custom-image');
    expect(argv).not.toContain('ubuntu-latest=-self-hosted');
  });

  it('disables json output when jsonOutput is false', () => {
    const argv = buildActArgv({
      jsonOutput: false
    });
    expect(argv).not.toContain('--json');
  });
});
