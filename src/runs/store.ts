import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { redactSecrets } from '../act/parser';
import { RunStoreIndex, WorkflowRun } from './types';

export class RunStore {
  private readonly runsDir: string;
  private readonly indexPath: string;
  private cachedRuns: WorkflowRun[] = [];
  private isLoaded = false;

  private readonly listeners: Array<() => void> = [];
  private readonly logListeners: Array<(runId: string, line: string) => void> = [];

  constructor(storageDir: string) {
    this.runsDir = path.join(storageDir, 'runs');
    this.indexPath = path.join(this.runsDir, 'index.json');
  }

  public onDidChangeRuns(listener: () => void): { dispose: () => void } {
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

  public onDidAppendLog(listener: (runId: string, line: string) => void): { dispose: () => void } {
    this.logListeners.push(listener);
    return {
      dispose: () => {
        const idx = this.logListeners.indexOf(listener);
        if (idx !== -1) {
          this.logListeners.splice(idx, 1);
        }
      }
    };
  }

  private notifyChange(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private notifyLog(runId: string, line: string): void {
    for (const listener of this.logListeners) {
      listener(runId, line);
    }
  }

  public async init(): Promise<void> {
    await fs.mkdir(this.runsDir, { recursive: true });
    try {
      const data = await fs.readFile(this.indexPath, 'utf8');
      const parsed = JSON.parse(data) as RunStoreIndex;
      this.cachedRuns = Array.isArray(parsed.runs) ? parsed.runs : [];
    } catch {
      this.cachedRuns = [];
    }
    this.isLoaded = true;
  }

  public async getRuns(): Promise<WorkflowRun[]> {
    if (!this.isLoaded) {
      await this.init();
    }
    return [...this.cachedRuns];
  }

  public getCachedRuns(): WorkflowRun[] {
    return [...this.cachedRuns];
  }

  public getRun(runId: string): WorkflowRun | undefined {
    return this.cachedRuns.find((r) => r.id === runId);
  }

  public async saveRun(run: WorkflowRun, maxRuns = 50): Promise<void> {
    if (!this.isLoaded) {
      await this.init();
    }

    const existingIdx = this.cachedRuns.findIndex((r) => r.id === run.id);
    if (existingIdx !== -1) {
      this.cachedRuns[existingIdx] = run;
    } else {
      this.cachedRuns.unshift(run);
    }

    if (this.cachedRuns.length > maxRuns) {
      const toRemove = this.cachedRuns.splice(maxRuns);
      for (const item of toRemove) {
        const logFile = path.join(this.runsDir, `${item.id}.log`);
        try {
          await fs.unlink(logFile);
        } catch {
          // Ignore removal errors
        }
      }
    }

    const indexContent: RunStoreIndex = {
      version: 1,
      runs: this.cachedRuns
    };
    await fs.writeFile(this.indexPath, JSON.stringify(indexContent, null, 2), 'utf8');
    this.notifyChange();
  }

  public async appendLog(runId: string, line: string, secrets: string[] = []): Promise<void> {
    if (!this.isLoaded) {
      await this.init();
    }

    const cleanLine = redactSecrets(line, secrets);
    const logFile = path.join(this.runsDir, `${runId}.log`);
    await fs.appendFile(logFile, cleanLine + '\n', 'utf8');
    this.notifyLog(runId, cleanLine);
  }

  public async getLog(runId: string): Promise<string> {
    if (!this.isLoaded) {
      await this.init();
    }

    const logFile = path.join(this.runsDir, `${runId}.log`);
    try {
      return await fs.readFile(logFile, 'utf8');
    } catch {
      return '';
    }
  }

  public async deleteRun(runId: string): Promise<void> {
    if (!this.isLoaded) {
      await this.init();
    }

    this.cachedRuns = this.cachedRuns.filter((r) => r.id !== runId);
    const logFile = path.join(this.runsDir, `${runId}.log`);
    try {
      await fs.unlink(logFile);
    } catch {
      // Ignore removal errors
    }

    const indexContent: RunStoreIndex = {
      version: 1,
      runs: this.cachedRuns
    };
    await fs.writeFile(this.indexPath, JSON.stringify(indexContent, null, 2), 'utf8');
    this.notifyChange();
  }

  public async clear(): Promise<void> {
    if (!this.isLoaded) {
      await this.init();
    }

    for (const run of this.cachedRuns) {
      const logFile = path.join(this.runsDir, `${run.id}.log`);
      try {
        await fs.unlink(logFile);
      } catch {
        // Ignore removal errors
      }
    }
    this.cachedRuns = [];
    await fs.writeFile(this.indexPath, JSON.stringify({ version: 1, runs: [] }, null, 2), 'utf8');
    this.notifyChange();
  }
}
