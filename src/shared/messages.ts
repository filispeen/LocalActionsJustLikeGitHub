import { WorkflowRun } from '../runs/types';
import { ParsedWorkflow } from '../workflows/types';

export type HostToWebviewMessage =
  | { type: 'init'; runs: WorkflowRun[]; workflows: ParsedWorkflow[] }
  | { type: 'runsUpdated'; runs: WorkflowRun[] }
  | { type: 'runUpdated'; run: WorkflowRun }
  | { type: 'workflowsUpdated'; workflows: ParsedWorkflow[] }
  | { type: 'logChunk'; runId: string; log: string }
  | { type: 'logAppended'; runId: string; line: string };

export type WebviewToHostMessage =
  | { type: 'ready' }
  | { type: 'runWorkflow'; workflowFilePath: string; jobId?: string }
  | { type: 'cancelRun'; runId: string }
  | { type: 'deleteRun'; runId: string }
  | { type: 'rerunRun'; runId: string }
  | { type: 'rerunFailedJobs'; runId: string }
  | { type: 'saveLogsToFile'; runId: string }
  | { type: 'openWorkflowFile'; filePath: string }
  | { type: 'requestLog'; runId: string };
