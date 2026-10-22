import React, { useEffect, useState } from 'react';
import { WorkflowRun } from '../../runs/types';
import { formatDuration, formatRelativeTime } from './format';
import { JobGraph } from './JobGraph';
import { StatusIcon } from './StatusIcon';
import { StepsViewer } from './StepsViewer';
import { getVsCodeApi } from './vscode';

interface RunDetailProps {
  run: WorkflowRun;
  logs: string;
  onBack: () => void;
  onRunWorkflow?: (filePath: string, jobId?: string) => void;
}

export function RunDetail({ run, logs, onBack }: RunDetailProps): React.ReactElement {
  const vscode = getVsCodeApi();
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(
    run.jobs[0]?.id
  );

  useEffect(() => {
    if (!logs) {
      vscode.postMessage({ type: 'requestLog', runId: run.id });
    }
  }, [run.id, logs, vscode]);

  const selectedJob = run.jobs.find((j) => j.id === selectedJobId) || run.jobs[0];
  const hasFailedJobs = run.jobs.some((j) => j.status === 'failure');
  const isRunning = run.status === 'in_progress';
  const duration = formatDuration(run.durationMs);
  const relativeTime = formatRelativeTime(run.startedAt);

  const handleCancel = () => {
    vscode.postMessage({ type: 'cancelRun', runId: run.id });
  };

  const handleRerunAll = () => {
    vscode.postMessage({ type: 'rerunRun', runId: run.id });
  };

  const handleRerunFailed = () => {
    vscode.postMessage({ type: 'rerunFailedJobs', runId: run.id });
  };

  const handleSaveLogs = () => {
    vscode.postMessage({ type: 'saveLogsToFile', runId: run.id });
  };

  const handleDelete = () => {
    vscode.postMessage({ type: 'deleteRun', runId: run.id });
    onBack();
  };

  return (
    <div className="d-flex flex-column flex-1 min-width-0 height-full" style={{ overflow: 'hidden' }}>
      <div
        className="p-3 border-bottom d-flex flex-wrap flex-items-center flex-justify-between gap-2"
        style={{
          backgroundColor: 'var(--color-canvas-default, #0d1117)',
          borderColor: 'var(--color-border-default, #30363d)'
        }}
      >
        <div>
          <button
            type="button"
            className="btn-link f6 d-flex flex-items-center gap-1 mb-1"
            onClick={onBack}
            style={{ color: 'var(--color-accent-fg, #58a6ff)', textDecoration: 'none' }}
          >
            ← Back to all runs
          </button>
          <div className="d-flex flex-items-center gap-2">
            <StatusIcon status={run.status} size={20} />
            <h2 className="f4 text-bold m-0" style={{ color: 'var(--color-fg-default, #c9d1d9)' }}>
              {run.workflowName}
            </h2>
            <span className="f6 color-fg-subtle">#{run.id}</span>
          </div>
          <div className="f6 mt-1" style={{ color: 'var(--color-fg-muted, #8b949e)' }}>
            <span>Triggered via {run.trigger || run.event}</span>
            <span className="mx-1">·</span>
            <span>{relativeTime}</span>
            {duration && (
              <>
                <span className="mx-1">·</span>
                <span>Took {duration}</span>
              </>
            )}
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2 flex-items-center">
          {isRunning ? (
            <button type="button" className="btn btn-sm btn-danger" onClick={handleCancel}>
              Cancel run
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-sm btn-primary" onClick={handleRerunAll}>
                Re-run all jobs
              </button>
              {hasFailedJobs && (
                <button type="button" className="btn btn-sm" onClick={handleRerunFailed}>
                  Re-run failed jobs
                </button>
              )}
            </>
          )}
          <button type="button" className="btn btn-sm" onClick={handleSaveLogs}>
            Save logs
          </button>
          <button
            type="button"
            className="btn btn-sm btn-invisible text-danger"
            onClick={handleDelete}
          >
            Delete run
          </button>
        </div>
      </div>

      <JobGraph
        jobs={run.jobs}
        selectedJobId={selectedJob?.id}
        onSelectJob={setSelectedJobId}
      />

      <StepsViewer
        job={selectedJob}
        rawLogs={logs}
        isRunActive={isRunning}
      />
    </div>
  );
}
