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
    <header
      className="p-3 border-bottom d-flex flex-justify-between flex-items-center"
      style={{
        borderColor: 'var(--color-border-default, #30363d)',
        backgroundColor: 'var(--color-canvas-default, #0d1117)'
      }}
    >
      <div className="d-flex flex-items-center">
        <h2 className="f4 text-bold m-0" style={{ color: 'var(--color-fg-default, #c9d1d9)' }}>
          {title}
        </h2>
        {selectedWorkflow && (
          <button
            type="button"
            className="btn-link ml-3 f6"
            onClick={() => onOpenFile?.(selectedWorkflow.filePath)}
            style={{ color: 'var(--color-accent-fg, #58a6ff)' }}
          >
            {selectedWorkflow.fileName}
          </button>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={handleRunClick}
        >
          Run workflow {selectedWorkflow ? '' : '▾'}
        </button>

        {!selectedWorkflow && dropdownOpen && (
          <div
            className="SelectMenu right-0 mt-1"
            style={{
              position: 'absolute',
              zIndex: 100,
              backgroundColor: 'var(--color-canvas-overlay, #161b22)',
              border: '1px solid var(--color-border-default, #30363d)',
              borderRadius: 6,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              minWidth: 220
            }}
          >
            <div className="SelectMenu-header p-2 border-bottom" style={{ borderColor: 'var(--color-border-default, #30363d)' }}>
              <span className="SelectMenu-title f6 text-bold">Select a workflow to run</span>
            </div>
            <div className="SelectMenu-list p-1">
              {workflows.map((wf) => (
                <button
                  type="button"
                  key={wf.filePath}
                  className="SelectMenu-item width-full text-left p-2 btn-link f6"
                  style={{
                    color: 'var(--color-fg-default, #c9d1d9)',
                    display: 'block',
                    textDecoration: 'none'
                  }}
                  onClick={() => {
                    setDropdownOpen(false);
                    onRunWorkflow(wf.filePath);
                  }}
                >
                  {wf.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
