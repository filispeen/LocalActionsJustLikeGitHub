import React from 'react';
import { WorkflowRun } from '../../runs/types';
import { formatDuration, formatRelativeTime } from './format';
import { StatusIcon } from './StatusIcon';

interface RunListProps {
  runs: WorkflowRun[];
  selectedRunId: string | undefined;
  onSelectRun: (run: WorkflowRun) => void;
  onCancelRun?: (runId: string) => void;
  onDeleteRun?: (runId: string) => void;
}

export function RunList({
  runs,
  selectedRunId,
  onSelectRun,
  onCancelRun,
  onDeleteRun
}: RunListProps): React.ReactElement {
  if (runs.length === 0) {
    return (
      <div className="p-6 text-center" style={{ color: 'var(--color-fg-muted, #8b949e)' }}>
        <p className="f4 mb-1">No workflow runs found</p>
        <p className="f6">Trigger a run using the button above or from the Workflows sidebar.</p>
      </div>
    );
  }

  return (
    <div className="Box-body p-0" style={{ overflowY: 'auto', flex: 1 }}>
      <ul className="list-style-none m-0 p-0">
        {runs.map((run) => {
          const isSelected = selectedRunId === run.id;
          const duration = formatDuration(run.durationMs);
          const relativeTime = formatRelativeTime(run.startedAt);

          return (
            <li
              key={run.id}
              className="Box-row d-flex flex-items-center flex-justify-between p-3 border-bottom"
              style={{
                cursor: 'pointer',
                borderColor: 'var(--color-border-default, #30363d)',
                backgroundColor: isSelected
                  ? 'var(--color-action-list-item-default-selected-bg, #1f242c)'
                  : 'transparent'
              }}
              onClick={() => onSelectRun(run)}
            >
              <div className="d-flex flex-items-center flex-1 mr-3 min-width-0">
                <div className="mr-3 d-flex flex-items-center">
                  <StatusIcon status={run.status} size={18} />
                </div>
                <div className="min-width-0">
                  <div className="f5 text-bold css-truncate css-truncate-target" style={{ color: 'var(--color-fg-default, #c9d1d9)' }}>
                    {run.workflowName}
                  </div>
                  <div className="f6 css-truncate css-truncate-target mt-1" style={{ color: 'var(--color-fg-muted, #8b949e)' }}>
                    <span>{run.workflowName}</span>
                    <span className="mx-1">·</span>
                    <span>{run.event}</span>
                    {run.branch && (
                      <>
                        <span className="mx-1">·</span>
                        <span>{run.branch}</span>
                      </>
                    )}
                    <span className="mx-1">·</span>
                    <span className="color-fg-subtle">#{run.id}</span>
                  </div>
                </div>
              </div>

              <div className="d-flex flex-items-center flex-shrink-0">
                <div className="text-right mr-3" style={{ color: 'var(--color-fg-muted, #8b949e)', minWidth: 100 }}>
                  {duration && <div className="f6">{duration}</div>}
                  <div className="f6 color-fg-subtle">{relativeTime}</div>
                </div>

                {run.status === 'in_progress' && onCancelRun && (
                  <button
                    type="button"
                    className="btn btn-sm btn-danger mr-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancelRun(run.id);
                    }}
                  >
                    Cancel
                  </button>
                )}

                {onDeleteRun && (
                  <button
                    type="button"
                    className="btn btn-sm btn-invisible"
                    title="Delete run"
                    style={{ color: 'var(--color-fg-muted, #8b949e)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRun(run.id);
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
