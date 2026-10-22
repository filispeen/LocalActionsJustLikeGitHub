import React, { useState } from 'react';
import { ParsedWorkflow } from '../../workflows/types';

interface HeaderProps {
  selectedWorkflow: ParsedWorkflow | undefined;
  workflows: ParsedWorkflow[];
  onRunWorkflow: (filePath: string) => void;
  onOpenFile?: (filePath: string) => void;
}

export function Header({
  selectedWorkflow,
  workflows,
  onRunWorkflow,
  onOpenFile
}: HeaderProps): React.ReactElement {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const title = selectedWorkflow ? selectedWorkflow.name : 'All workflows';

  const handleRunClick = () => {
    if (selectedWorkflow) {
      onRunWorkflow(selectedWorkflow.filePath);
    } else {
      setDropdownOpen(!dropdownOpen);
    }
  };

  return (
    <div className="gh-page-head">
      <div>
        <h1>
          {title}
          {selectedWorkflow && (
            <button
              type="button"
              className="gh-link gh-fname"
              onClick={() => onOpenFile?.(selectedWorkflow.filePath)}
            >
              {selectedWorkflow.fileName}
            </button>
          )}
        </h1>
        {!selectedWorkflow && (
          <div className="gh-run-sub gh-sub">Showing runs from all workflows</div>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <button type="button" className="gh-btn" onClick={handleRunClick}>
          Run workflow{selectedWorkflow ? '' : ' ▾'}
        </button>

        {!selectedWorkflow && dropdownOpen && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 36,
              zIndex: 100,
              minWidth: 240,
              background: 'var(--gh-subtle)',
              border: '1px solid var(--gh-border)',
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(1,4,9,.85)',
              padding: 8
            }}
          >
            <div className="gh-nav-title">Select a workflow to run</div>
            {workflows.map((wf) => (
              <button
                type="button"
                key={wf.filePath}
                className="gh-nav-item"
                onClick={() => {
                  setDropdownOpen(false);
                  onRunWorkflow(wf.filePath);
                }}
              >
                {wf.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
