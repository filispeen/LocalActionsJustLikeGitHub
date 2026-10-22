import React from 'react';
import { WorkflowRun } from '../../runs/types';
import { describeTrigger, formatDateTime, formatDuration } from './format';
import { StatusIcon } from './StatusIcon';

interface RunListProps {
  runs: WorkflowRun[];
  runNumbers: Record<string, number>;
  selectedRunId: string | undefined;
  onSelectRun: (run: WorkflowRun) => void;
  onCancelRun?: (runId: string) => void;
  onDeleteRun?: (runId: string) => void;
  filters?: React.ReactNode;
}

const CalendarIcon = (): React.ReactElement => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M4.75 0a.75.75 0 0 1 .75.75V2h5V.75a.75.75 0 0 1 1.5 0V2h1.25c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 13.25 16H2.75A1.75 1.75 0 0 1 1 14.25V3.75C1 2.784 1.784 2 2.75 2H4V.75A.75.75 0 0 1 4.75 0ZM2.5 7.5v6.75c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V7.5Zm10.75-4H2.75a.25.25 0 0 0-.25.25V6h11V3.75a.25.25 0 0 0-.25-.25Z" />
  </svg>
);

const StopwatchIcon = (): React.ReactElement => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M5.75.75A.75.75 0 0 1 6.5 0h3a.75.75 0 0 1 0 1.5h-.75v1l-.001.041a6.718 6.718 0 0 1 3.464 1.435l.007-.006.75-.75a.749.749 0 1 1 1.06 1.06l-.75.75-.006.007a6.75 6.75 0 1 1-10.548 0L2.72 5.03l-.75-.75a.749.749 0 1 1 1.06-1.06l.75.75.007.006A6.718 6.718 0 0 1 7.25 2.541V1.5H6.5a.75.75 0 0 1-.75-.75ZM8 14.5a5.25 5.25 0 1 0-.001-10.499A5.25 5.25 0 0 0 8 14.5Zm.389-6.7 1.33-1.33a.749.749 0 1 1 1.06 1.06L9.45 8.86A1.5 1.5 0 1 1 8.39 7.8Z" />
  </svg>
);

export function RunList({
  runs,
  runNumbers,
  selectedRunId,
  onSelectRun,
  onCancelRun,
  onDeleteRun,
  filters
}: RunListProps): React.ReactElement {
  return (
    <div className="gh-box">
      <div className="gh-box-header">
        <span className="gh-grow">
          {runs.length} workflow run{runs.length === 1 ? '' : 's'}
        </span>
        {filters}
      </div>

      {runs.length === 0 ? (
        <div className="gh-empty">
          <h3>No workflow runs found</h3>
          <div>Trigger a run using the button above.</div>
        </div>
      ) : (
        runs.map((run) => {
          const duration = formatDuration(run.durationMs);
          const num = runNumbers[run.id];
          const label = `${run.workflowName}${num ? ` #${num}` : ''}: ${describeTrigger(run.event, run.trigger)}`;

          return (
            <div
              key={run.id}
              role="button"
              tabIndex={0}
              aria-label={`Run ${run.workflowName} status ${run.status}`}
              className="gh-run"
              style={selectedRunId === run.id ? { background: 'var(--gh-selected)' } : undefined}
              onClick={() => onSelectRun(run)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectRun(run);
                }
              }}
            >
              <span className="gh-run-icon">
                <StatusIcon status={run.status} size={16} />
              </span>
              <div className="gh-run-main">
                <div className="gh-run-title" title={run.workflowName}>
                  {run.workflowName}
                </div>
                <div className="gh-run-sub" title={label}>
                  {label}
                </div>
              </div>
              <div className="gh-run-branch">
                {run.branch && (
                  <span className="gh-branch" title={run.branch}>
                    {run.branch}
                  </span>
                )}
              </div>
              <div className="gh-run-meta">
                <div>
                  <CalendarIcon />
                  <span>{formatDateTime(run.startedAt)}</span>
                </div>
                {duration && (
                  <div>
                    <StopwatchIcon />
                    <span>{duration}</span>
                  </div>
                )}
              </div>
              <div className="gh-run-actions">
                {run.status === 'in_progress' && onCancelRun && (
                  <button
                    type="button"
                    aria-label={`Cancel run ${run.id}`}
                    className="gh-btn gh-btn-sm gh-btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancelRun(run.id);
                    }}
                  >
                    Cancel
                  </button>
                )}
                {onDeleteRun && run.status !== 'in_progress' && (
                  <button
                    type="button"
                    aria-label={`Delete run ${run.id}`}
                    className="gh-btn gh-btn-sm gh-btn-invisible gh-btn-icon"
                    title="Delete run"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRun(run.id);
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
