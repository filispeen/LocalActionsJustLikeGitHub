import { ChildProcess, spawn } from 'node:child_process';
import { RunStore } from '../runs/store';
import { WorkflowRun } from '../runs/types';
import { ActRunOptions, buildActArgv } from './argv';
import { parseActJsonLine, parseActTextLine, redactSecrets } from './parser';
import { killProcessTree } from './processTree';

export interface RunnerEvents {
  onDidUpdateRun?: (run: WorkflowRun) => void;
  onDidAppendLog?: (runId: string, line: string) => void;
  onDidFinishRun?: (run: WorkflowRun) => void;
}

export class ActRunner {
  private child: ChildProcess | undefined;
  private isCancelled = false;

  constructor(
    private readonly actPath: string,
    private readonly cwd: string,
    private readonly run: WorkflowRun,
    private readonly options: ActRunOptions,
    private readonly secretsToRedact: string[],
    private readonly store: RunStore,
    private readonly events: RunnerEvents = {}
  ) {}

  public async start(): Promise<WorkflowRun> {
    const argv = buildActArgv(this.options);
    this.run.status = 'in_progress';
    this.run.startedAt = new Date().toISOString();
    await this.store.saveRun(this.run);
    this.events.onDidUpdateRun?.(this.run);

    return new Promise<WorkflowRun>((resolve) => {
      let stdoutBuffer = '';
      let stderrBuffer = '';

      const child = spawn(this.actPath, argv, {
        cwd: this.cwd,
        windowsHide: true,
        env: {
          ...process.env,
          CI: 'true'
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

        const cleanMsg = redactSecrets(event.message ?? line, this.secretsToRedact);
        await this.store.appendLog(this.run.id, cleanMsg, this.secretsToRedact);
        this.events.onDidAppendLog?.(this.run.id, cleanMsg);

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

        await this.store.saveRun(this.run);
        this.events.onDidUpdateRun?.(this.run);
      };

      child.stdout.on('data', (chunk: Buffer) => {
        stdoutBuffer += chunk.toString('utf8');
        const lines = stdoutBuffer.split(/\r?\n/);
        stdoutBuffer = lines.pop() ?? '';
        for (const line of lines) {
          processLine(line);
        }
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderrBuffer += chunk.toString('utf8');
        const lines = stderrBuffer.split(/\r?\n/);
        stderrBuffer = lines.pop() ?? '';
        for (const line of lines) {
          processLine(line);
        }
      });

      child.on('error', async (err) => {
        if (this.isCancelled) {
          return;
        }
        this.run.status = 'failure';
        this.run.errorMessage = err.message;
        this.finishRun(resolve);
      });

      child.on('close', async (code) => {
        if (stdoutBuffer.trim().length > 0) {
          await processLine(stdoutBuffer);
        }
        if (stderrBuffer.trim().length > 0) {
          await processLine(stderrBuffer);
        }

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

    await this.store.saveRun(this.run);
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
