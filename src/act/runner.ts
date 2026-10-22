import { ChildProcess, spawn } from 'node:child_process';
import { RunStore } from '../runs/store';
import { WorkflowRun } from '../runs/types';
import { ActRunOptions, buildActArgv } from './argv';
import { parseActJsonLine, parseActTextLine } from './parser';
import { killProcessTree } from './processTree';

export interface RunnerEvents {
  onDidUpdateRun?: (run: WorkflowRun) => void;
  onDidAppendLog?: (runId: string, line: string) => void;
  onDidFinishRun?: (run: WorkflowRun) => void;
}

export class ActRunner {
  private child: ChildProcess | undefined;
  private isCancelled = false;
  private processingChain: Promise<void> = Promise.resolve();

  constructor(
    private readonly actPath: string,
    private readonly cwd: string,
    private readonly run: WorkflowRun,
    private readonly options: ActRunOptions,
    private readonly secretsToRedact: string[],
    private readonly store: RunStore,
    private readonly events: RunnerEvents = {},
    private readonly retentionLimit = 50
  ) {}

  public async start(): Promise<WorkflowRun> {
    const argv = buildActArgv(this.options);
    this.run.status = 'in_progress';
    this.run.startedAt = new Date().toISOString();
    await this.store.saveRun(this.run, this.retentionLimit);
    this.events.onDidUpdateRun?.(this.run);

    return new Promise<WorkflowRun>((resolve) => {
      let stdoutBuffer = '';
      let stderrBuffer = '';

      const secretsEnv: Record<string, string> = {};
      if (this.options.secrets) {
        for (const [key, value] of Object.entries(this.options.secrets)) {
          if (key.trim().length > 0) {
            secretsEnv[key.trim()] = value;
          }
        }
      }

      const child = spawn(this.actPath, argv, {
        cwd: this.cwd,
        windowsHide: true,
        detached: process.platform !== 'win32',
        env: {
          ...process.env,
          CI: 'true',
          ...secretsEnv
        }
      });
      this.child = child;

      const processLine = async (line: string): Promise<void> => {
        if (!line.trim()) {
          return;
        }

        const isJson = this.options.jsonOutput !== false;
        const parsed = isJson ? parseActJsonLine(line) : undefined;
        const event = parsed ?? parseActTextLine(line);

        let logLine = event.message ?? line;
        if (isJson) {
          const jobPrefix = event.jobName ?? event.jobId ?? 'job';
          if (event.type === 'step_start') {
            if (!logLine.includes('⭐ Run ')) {
              logLine = `[${jobPrefix}] ⭐ Run ${event.stepName ?? ''}`;
            } else if (!logLine.startsWith('[')) {
              logLine = `[${jobPrefix}] ${logLine}`;
            }
          } else if (event.type === 'step_finish') {
            const icon = event.status === 'success' ? '✅  Success - ' : '❌  Failure - ';
            const dur = event.durationMs !== undefined ? ` [${event.durationMs}ms]` : '';
            logLine = `[${jobPrefix}]   ${icon}${event.stepName ?? ''}${dur}`;
          } else if (event.type === 'job_finish') {
            const statusMsg = event.status === 'success' ? '🏁  Job succeeded' : '🏁  Job failed';
            logLine = `[${jobPrefix}]   ${statusMsg}`;
          } else if (event.type === 'log_line') {
            if (!logLine.startsWith('[')) {
              logLine = `[${jobPrefix}]   | ${logLine}`;
            }
          }
        }

        await this.store.appendLog(this.run.id, logLine, this.secretsToRedact);
        this.events.onDidAppendLog?.(this.run.id, logLine);

        if (event.jobId || event.jobName) {
          let job = this.run.jobs.find((j) => j.id === event.jobId || j.name === event.jobName);
          if (!job) {
            job = {
              id: event.jobId ?? event.jobName ?? 'job',
              name: event.jobName ?? event.jobId ?? 'Job',
              status: 'in_progress',
              startedAt: event.timestamp ?? new Date().toISOString(),
              needs: [],
              steps: []
            };
            this.run.jobs.push(job);
          }

          if (event.type === 'job_finish' && event.status) {
            job.status = event.status;
            job.completedAt = event.timestamp ?? new Date().toISOString();
          }

          if (event.stepName) {
            let step = job.steps.find((s) => s.name === event.stepName || s.id === event.stepId);
            if (!step) {
              step = {
                id: event.stepId ?? event.stepName,
                name: event.stepName,
                status: 'in_progress',
                startedAt: event.timestamp ?? new Date().toISOString(),
                logLinesCount: 0
              };
              job.steps.push(step);
            }

            if (event.type === 'step_start') {
              step.status = 'in_progress';
            } else if (event.type === 'step_finish' && event.status) {
              step.status = event.status;
              step.completedAt = event.timestamp ?? new Date().toISOString();
              if (event.durationMs !== undefined) {
                step.durationMs = event.durationMs;
              }
            } else if (event.type === 'log_line') {
              step.logLinesCount++;
            }
          }
        }

        if (event.type !== 'log_line') {
          await this.store.saveRun(this.run, this.retentionLimit);
          this.events.onDidUpdateRun?.(this.run);
        }
      };

      child.stdout.on('data', (chunk: Buffer) => {
        stdoutBuffer += chunk.toString('utf8');
        const lines = stdoutBuffer.split(/\r?\n/);
        stdoutBuffer = lines.pop() ?? '';
        for (const line of lines) {
          this.processingChain = this.processingChain
            .then(() => processLine(line))
            .catch(() => {});
        }
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderrBuffer += chunk.toString('utf8');
        const lines = stderrBuffer.split(/\r?\n/);
        stderrBuffer = lines.pop() ?? '';
        for (const line of lines) {
          this.processingChain = this.processingChain
            .then(() => processLine(line))
            .catch(() => {});
        }
      });

      child.on('error', async (err) => {
        if (this.isCancelled) {
          return;
        }
        await this.processingChain;
        this.run.status = 'failure';
        this.run.errorMessage = err.message;
        await this.finishRun(resolve);
      });

      child.on('close', async (code) => {
        if (stdoutBuffer.trim().length > 0) {
          this.processingChain = this.processingChain
            .then(() => processLine(stdoutBuffer))
            .catch(() => {});
        }
        if (stderrBuffer.trim().length > 0) {
          this.processingChain = this.processingChain
            .then(() => processLine(stderrBuffer))
            .catch(() => {});
        }

        await this.processingChain;

        if (this.isCancelled) {
          this.run.status = 'cancelled';
        } else if (this.run.status === 'in_progress') {
          const hasFailure = this.run.jobs.some((j) => j.status === 'failure');
          if (hasFailure || code !== 0) {
            this.run.status = 'failure';
          } else {
            this.run.status = 'success';
          }
        }

        await this.finishRun(resolve);
      });
    });
  }

  private async finishRun(resolve: (run: WorkflowRun) => void): Promise<void> {
    this.run.completedAt = new Date().toISOString();
    const startMs = new Date(this.run.startedAt).getTime();
    const endMs = new Date(this.run.completedAt).getTime();
    this.run.durationMs = Math.max(0, endMs - startMs);

    await this.store.saveRun(this.run, this.retentionLimit);
    await this.store.flush();
    this.events.onDidUpdateRun?.(this.run);
    this.events.onDidFinishRun?.(this.run);
    resolve(this.run);
  }

  public async cancel(): Promise<void> {
    if (this.isCancelled) {
      return;
    }
    this.isCancelled = true;
    this.run.status = 'cancelled';

    if (this.child && typeof this.child.pid === 'number') {
      await killProcessTree(this.child.pid);
    }
  }
}
