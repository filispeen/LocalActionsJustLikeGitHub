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
    <aside aria-label="Workflows navigation" className="gh-sidebar">
      <div className="gh-nav-section" style={{ fontSize: 14, color: 'var(--gh-fg)', paddingBottom: 8 }}>
        Workflows
      </div>
      <input
        type="text"
        className="gh-input gh-input-sm gh-nav-input"
        placeholder="Filter workflows"
        aria-label="Filter workflows"
        value={filterQuery}
        onChange={(e) => setFilterQuery(e.target.value)}
      />

      <nav aria-label="Workflows list">
        <button
          type="button"
          className={`gh-nav-item ${selectedWorkflowPath === undefined ? 'is-active' : ''}`}
          onClick={() => onSelectWorkflow(undefined)}
        >
          <span className="gh-grow">All workflows</span>
          <span className="gh-counter">{runs.length}</span>
        </button>

        {filteredWorkflows.map((wf) => {
          const isSelected = selectedWorkflowPath === wf.filePath;
          const count = runs.filter((r) => r.workflowFilePath === wf.filePath).length;
          return (
            <button
              type="button"
              key={wf.filePath}
              className={`gh-nav-item ${isSelected ? 'is-active' : ''}`}
              title={wf.isValid ? wf.name : `Error: ${wf.error}`}
              onClick={() => onSelectWorkflow(wf.filePath)}
            >
              {!wf.isValid && <span style={{ color: 'var(--gh-danger)' }}>⚠</span>}
              <span className="gh-grow">{wf.name}</span>
              <span className="gh-counter">{count}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
