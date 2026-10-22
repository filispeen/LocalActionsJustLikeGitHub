export interface ActRunOptions {
  workflowPath?: string;
  jobId?: string;
  event?: string;
  eventPayloadPath?: string;
  secrets?: Record<string, string>;
  secretFile?: string;
  variables?: Record<string, string>;
  varFile?: string;
  inputs?: Record<string, string>;
  inputFile?: string;
  platforms?: Record<string, string>;
  useHostRunner?: boolean;
  extraArgs?: string[];
  dryrun?: boolean;
  jsonOutput?: boolean;
}

export function buildActArgv(options: ActRunOptions): string[] {
  const argv: string[] = [];

  if (options.event && options.event.trim().length > 0) {
    argv.push(options.event.trim());
  }

  if (options.workflowPath && options.workflowPath.trim().length > 0) {
    argv.push('-W', options.workflowPath.trim());
  }

  if (options.jobId && options.jobId.trim().length > 0) {
    argv.push('-j', options.jobId.trim());
  }

  if (options.eventPayloadPath && options.eventPayloadPath.trim().length > 0) {
    argv.push('-e', options.eventPayloadPath.trim());
  }

  if (options.secrets) {
    for (const key of Object.keys(options.secrets)) {
      if (key.trim().length > 0) {
        argv.push('-s', key.trim());
      }
    }
  }

  if (options.secretFile && options.secretFile.trim().length > 0) {
    argv.push('--secret-file', options.secretFile.trim());
  }

  if (options.variables) {
    for (const [key, value] of Object.entries(options.variables)) {
      if (key.trim().length > 0) {
        argv.push('--var', `${key.trim()}=${value}`);
      }
    }
  }

  if (options.varFile && options.varFile.trim().length > 0) {
    argv.push('--var-file', options.varFile.trim());
  }

  if (options.inputs) {
    for (const [key, value] of Object.entries(options.inputs)) {
      if (key.trim().length > 0) {
        argv.push('--input', `${key.trim()}=${value}`);
      }
    }
  }

  if (options.inputFile && options.inputFile.trim().length > 0) {
    argv.push('--input-file', options.inputFile.trim());
  }

  const standardHostPlatforms = [
    'ubuntu-latest',
    'ubuntu-24.04',
    'ubuntu-22.04',
    'ubuntu-20.04',
    'windows-latest',
    'windows-2022',
    'windows-2019',
    'macos-latest',
    'macos-14',
    'macos-13',
    'macos-12'
  ];

  if (options.platforms) {
    for (const [key, value] of Object.entries(options.platforms)) {
      if (key.trim().length > 0) {
        argv.push('-P', `${key.trim()}=${value.trim()}`);
      }
    }
  }

  if (options.useHostRunner) {
    for (const platform of standardHostPlatforms) {
      if (!options.platforms || options.platforms[platform] === undefined) {
        argv.push('-P', `${platform}=-self-hosted`);
      }
    }
  }

  if (options.dryrun) {
    argv.push('-n');
  }

  if (options.jsonOutput !== false) {
    argv.push('--json');
  }

  if (options.extraArgs) {
    for (const arg of options.extraArgs) {
      if (arg.trim().length > 0) {
        argv.push(arg.trim());
      }
    }
  }

  return argv;
}
