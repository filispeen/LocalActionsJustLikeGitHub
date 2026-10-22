import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface ActStatus {
  installed: boolean;
  version?: string;
  path: string;
  error?: string;
}

export interface DockerStatus {
  installed: boolean;
  running: boolean;
  version?: string;
  error?: string;
}

export function parseActVersion(output: string): string | undefined {
  const match = output.match(/act\s+version\s+([0-9]+\.[0-9]+\.[0-9]+[^\s]*)/i);
  if (match) {
    return match[1];
  }
  const fallbackMatch = output.match(/([0-9]+\.[0-9]+\.[0-9]+[^\s]*)/);
  return fallbackMatch ? fallbackMatch[1] : undefined;
}

export function parseDockerVersion(output: string): string | undefined {
  const match = output.match(/Docker\s+version\s+([0-9]+\.[0-9]+\.[0-9]+[^\s,]*)/i);
  if (match) {
    return match[1];
  }
  const fallbackMatch = output.match(/([0-9]+\.[0-9]+\.[0-9]+[^\s,]*)/);
  return fallbackMatch ? fallbackMatch[1] : undefined;
}

export async function detectAct(configuredPath?: string): Promise<ActStatus> {
  const actPath = configuredPath && configuredPath.trim().length > 0 ? configuredPath.trim() : 'act';

  try {
    const { stdout, stderr } = await execFileAsync(actPath, ['--version'], {
      timeout: 5000,
      windowsHide: true
    });
    const output = stdout.trim() || stderr.trim();
    const version = parseActVersion(output);
    return {
      installed: true,
      version: version ?? output,
      path: actPath
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isNotFound = message.includes('ENOENT') || message.includes('not found') || message.includes('not recognized');
    return {
      installed: false,
      path: actPath,
      error: isNotFound ? 'act executable not found' : message
    };
  }
}

export async function detectDocker(dockerPath = 'docker'): Promise<DockerStatus> {
  let cliVersion: string | undefined;

  try {
    const { stdout, stderr } = await execFileAsync(dockerPath, ['--version'], {
      timeout: 5000,
      windowsHide: true
    });
    const output = stdout.trim() || stderr.trim();
    cliVersion = parseDockerVersion(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isNotFound = message.includes('ENOENT') || message.includes('not found') || message.includes('not recognized');
    return {
      installed: false,
      running: false,
      error: isNotFound ? 'Docker CLI not found' : message
    };
  }

  try {
    await execFileAsync(dockerPath, ['info'], {
      timeout: 5000,
      windowsHide: true
    });
    return {
      installed: true,
      running: true,
      version: cliVersion
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      installed: true,
      running: false,
      version: cliVersion,
      error: message.includes('daemon') || message.includes('connect')
        ? 'Docker daemon is not running'
        : message
    };
  }
}
