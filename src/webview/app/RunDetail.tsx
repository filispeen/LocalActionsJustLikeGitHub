import React, { useEffect, useState } from 'react';
import { WorkflowRun } from '../../runs/types';
import { describeTrigger, formatDuration, formatRelativeTime } from './format';
import { JobGraph } from './JobGraph';
import { StatusIcon } from './StatusIcon';
import { StepsViewer } from './StepsViewer';
import { getVsCodeApi } from './vscode';

interface RunDetailProps {
  run: WorkflowRun;
  runNumber?: number;
  logs: string;
  onBack: () => void;
  onOpenFile?: (filePath: string) => void;
}

type View = { kind: 'summary' } | { kind: 'job'; jobId: string };

export function RunDetail({ run, runNumber, logs, onBack, onOpenFile }: RunDetailProps): React.ReactElement {
  const vscode = getVsCodeApi();
  const [view, setView] = useState<View>({ kind: 'summary' });

  useEffect(() => {
    if (!logs) {
      vscode.postMessage({ type: 'requestLog', runId: run.id });
    }
  }, [run.id, logs, vscode]);

  const isRunning = run.status === 'in_progress';
  const hasFailedJobs = run.jobs.some((j) => j.status === 'failure');
  const duration = formatDuration(run.durationMs);
  const selectedJob = view.kind === 'job' ? run.jobs.find((j) => j.id === view.jobId) : undefined;
  const statusLabel =
    run.status === 'success' ? 'Success' : run.status === 'failure' ? 'Failure' : run.status === 'in_progress' ? 'In progress' : run.status === 'cancelled' ? 'Cancelled' : run.status === 'queued' ? 'Queued' : 'Skipped';

  const post = (type: 'cancelRun' | 'rerunRun' | 'rerunFailedJobs' | 'saveLogsToFile') =>
    vscode.postMessage({ type, runId: run.id });

  const handleDelete = () => {
    vscode.postMessage({ type: 'deleteRun', runId: run.id });
    onBack();
  };

  return (
    <div className="gh-run-layout">
      <nav className="gh-run-nav" aria-label="Run navigation">
        <button
          type="button"
          className={`gh-nav-item ${view.kind === 'summary' ? 'is-active' : ''}`}
          onClick={() => setView({ kind: 'summary' })}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M6.906.664a1.749 1.749 0 0 1 2.187 0l5.25 4.2c.415.332.657.835.657 1.367v7.019A1.75 1.75 0 0 1 13.25 15h-3.5a.75.75 0 0 1-.75-.75V9H7v5.25a.75.75 0 0 1-.75.75h-3.5A1.75 1.75 0 0 1 1 13.25V6.23c0-.531.242-1.034.657-1.366l5.249-4.2Zm1.25 1.171a.25.25 0 0 0-.312 0l-5.25 4.2a.25.25 0 0 0-.094.196v7.019c0 .138.112.25.25.25H5.5V8.25a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 .75.75v5.25h2.75a.25.25 0 0 0 .25-.25V6.23a.25.25 0 0 0-.094-.195Z" />
          </svg>
          <span className="gh-grow">Summary</span>
        </button>

        <div className="gh-nav-section">All jobs</div>
        {run.jobs.map((job) => (
          <button
            type="button"
            key={job.id}
            className={`gh-nav-item ${view.kind === 'job' && view.jobId === job.id ? 'is-active' : ''}`}
            onClick={() => setView({ kind: 'job', jobId: job.id })}
            title={job.name}
          >
            <StatusIcon status={job.status} size={16} />
            <span className="gh-grow">{job.name}</span>
          </button>
        ))}

        <div className="gh-nav-divider" />
        <div className="gh-nav-section">Run details</div>
        <button type="button" className="gh-nav-item" onClick={() => onOpenFile?.(run.workflowFilePath)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25ZM3.5 6.25a.75.75 0 0 1 .75-.75h7a.75.75 0 0 1 0 1.5h-7a.75.75 0 0 1-.75-.75Zm.75 2.25h4a.75.75 0 0 1 0 1.5h-4a.75.75 0 0 1 0-1.5Z" />
          </svg>
          <span className="gh-grow">Workflow file</span>
        </button>
      </nav>

      <div className="gh-run-content">
        <div className="gh-page">
          <button type="button" className="gh-link gh-back" onClick={onBack}>
            ← {run.workflowName}
          </button>

          <div className="gh-run-head">
            <div className="gh-run-title-row">
              <StatusIcon status={run.status} size={24} />
              <h1>{run.workflowName}</h1>
              {runNumber ? <span className="gh-num">#{runNumber}</span> : null}
            </div>

            <div className="gh-head-actions">
              {isRunning ? (
                <button type="button" className="gh-btn gh-btn-danger" onClick={() => post('cancelRun')}>
                  Cancel workflow
                </button>
              ) : (
                <>
                  <button type="button" className="gh-btn" onClick={() => post('rerunRun')}>
                    Re-run all jobs
                  </button>
                  {hasFailedJobs && (
                    <button type="button" className="gh-btn" onClick={() => post('rerunFailedJobs')}>
                      Re-run failed jobs
                    </button>
                  )}
                </>
              )}
              <button type="button" className="gh-btn" onClick={() => post('saveLogsToFile')}>
                Save logs
              </button>
              <button type="button" className="gh-btn gh-btn-danger" onClick={handleDelete}>
                Delete run
              </button>
            </div>
          </div>

          {view.kind === 'summary' || !selectedJob ? (
            <>
              <div className="gh-box">
                <div className="gh-meta-grid">
                  <div>
                    <div className="gh-meta-trigger">
                      {describeTrigger(run.event, run.trigger)} {formatRelativeTime(run.startedAt)}
                    </div>
                    <div className="gh-meta-value">
                      {run.commitSha && (
                        <span style={{ fontFamily: 'var(--gh-mono)', fontWeight: 400 }}>{run.commitSha.slice(0, 7)}</span>
                      )}
                      {run.branch && <span className="gh-branch">{run.branch}</span>}
                    </div>
                  </div>
                  <div>
                    <div className="gh-meta-label">Status</div>
                    <div className="gh-meta-value">{statusLabel}</div>
                  </div>
                  <div>
                    <div className="gh-meta-label">Total duration</div>
                    <div className="gh-meta-value">{duration || '-'}</div>
                  </div>
                  <div>
                    <div className="gh-meta-label">Jobs</div>
                    <div className="gh-meta-value">{run.jobs.length}</div>
                  </div>
                </div>
              </div>

              <div className="gh-box">
                <div className="gh-box-section">
                  <div className="gh-wf-name">{run.workflowFilePath.split(/[\\/]/).pop()}</div>
                  <div className="gh-wf-on">on: {run.event}</div>
                </div>
                <div className="gh-box-section" style={{ padding: 0 }}>
                  <JobGraph jobs={run.jobs} selectedJobId={undefined} onSelectJob={(id) => setView({ kind: 'job', jobId: id })} />
                </div>
              </div>

              {run.errorMessage && (
                <div className="gh-flash gh-flash-error" style={{ marginTop: 16 }}>
                  {run.errorMessage}
                </div>
              )}
            </>
          ) : (
            <StepsViewer job={selectedJob} rawLogs={logs} isRunActive={isRunning} />
          )}
        </div>
      </div>
    </div>
  );
}
