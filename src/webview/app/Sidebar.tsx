import React, { useState } from 'react';
import { ParsedWorkflow } from '../../workflows/types';
import { WorkflowRun } from '../../runs/types';

interface SidebarProps {
  workflows: ParsedWorkflow[];
  runs: WorkflowRun[];
  selectedWorkflowPath: string | undefined;
  onSelectWorkflow: (filePath: string | undefined) => void;
}

export function Sidebar({
  workflows,
  runs,
  selectedWorkflowPath,
  onSelectWorkflow
}: SidebarProps): React.ReactElement {
  const [filterQuery, setFilterQuery] = useState('');

  const filteredWorkflows = workflows.filter((w) =>
    w.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <aside
      aria-label="Workflows navigation"
      className="border-right"
      style={{
        width: 280,
        minWidth: 240,
        height: '100%',
        overflowY: 'auto',
        backgroundColor: 'var(--color-canvas-subtle, #161b22)',
        borderColor: 'var(--color-border-default, #30363d)'
      }}
    >
      <div className="p-3 border-bottom" style={{ borderColor: 'var(--color-border-default, #30363d)' }}>
        <h3 className="f5 text-bold mb-2" style={{ color: 'var(--color-fg-default, #c9d1d9)' }}>
          Workflows
        </h3>
        <input
          type="text"
          className="form-control input-sm width-full"
          placeholder="Filter workflows"
          aria-label="Filter workflows"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          style={{
            backgroundColor: 'var(--color-canvas-default, #0d1117)',
            color: 'var(--color-fg-default, #c9d1d9)',
            borderColor: 'var(--color-border-default, #30363d)'
          }}
        />
      </div>

      <nav aria-label="Workflows list" className="p-2">
        <ul className="ActionList" role="list">
          <li
            role="button"
            tabIndex={0}
            aria-label="All workflows"
            aria-selected={selectedWorkflowPath === undefined}
            className={`ActionList-item ${selectedWorkflowPath === undefined ? 'ActionList-item--navActive' : ''}`}
            onClick={() => onSelectWorkflow(undefined)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectWorkflow(undefined);
              }
            }}
            style={{
              cursor: 'pointer',
              backgroundColor: selectedWorkflowPath === undefined ? 'var(--color-action-list-item-default-selected-bg, #1f242c)' : 'transparent',
              borderRadius: 6
            }}
          >
            <span className="ActionList-content d-flex flex-justify-between flex-items-center width-full p-2">
              <span className="ActionList-item-label f6 text-bold">All workflows</span>
              <span className="Counter Counter--gray">{runs.length}</span>
            </span>
          </li>

          {filteredWorkflows.map((wf) => {
            const isSelected = selectedWorkflowPath === wf.filePath;
            const wfRunsCount = runs.filter((r) => r.workflowFilePath === wf.filePath).length;

            return (
              <li
                key={wf.filePath}
                role="button"
                tabIndex={0}
                aria-label={`Workflow ${wf.name}`}
                aria-selected={isSelected}
                className={`ActionList-item ${isSelected ? 'ActionList-item--navActive' : ''}`}
                onClick={() => onSelectWorkflow(wf.filePath)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectWorkflow(wf.filePath);
                  }
                }}
                style={{
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'var(--color-action-list-item-default-selected-bg, #1f242c)' : 'transparent',
                  borderRadius: 6
                }}
              >
                <span className="ActionList-content d-flex flex-justify-between flex-items-center width-full p-2">
                  <span
                    className="ActionList-item-label f6 css-truncate css-truncate-target d-flex flex-items-center gap-1"
                    title={wf.name}
                    style={{ maxWidth: 180 }}
                  >
                    {!wf.isValid && (
                      <span className="color-fg-danger" title={`Error: ${wf.error}`}>
                        ⚠
                      </span>
                    )}
                    <span>{wf.name}</span>
                  </span>
                  <span className="Counter Counter--gray">{wfRunsCount}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
