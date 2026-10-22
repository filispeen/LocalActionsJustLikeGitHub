export type RunStatus = 'queued' | 'in_progress' | 'success' | 'failure' | 'cancelled' | 'skipped';

export interface RunStep {
  id: string;
  name: string;
  status: RunStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  logLinesCount: number;
}

export interface RunJob {
  id: string;
  name: string;
  status: RunStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  needs: string[];
  steps: RunStep[];
}

export interface WorkflowRun {
  id: string;
  workflowFilePath: string;
  workflowName: string;
  event: string;
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  jobs: RunJob[];
  trigger: string;
  branch?: string;
  commitSha?: string;
  errorMessage?: string;
}

export interface RunStoreIndex {
  version: number;
  runs: WorkflowRun[];
}
