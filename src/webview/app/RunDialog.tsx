import React, { useEffect, useState } from 'react';
import { RunWorkflowPayload } from '../../shared/messages';
import { ParsedWorkflow } from '../../workflows/types';

interface RunDialogProps {
  workflows: ParsedWorkflow[];
  initialWorkflowPath?: string;
  initialJobId?: string;
  onClose: () => void;
  onRun: (payload: RunWorkflowPayload) => void;
}

export function RunDialog({
  workflows,
  initialWorkflowPath,
  initialJobId,
  onClose,
  onRun
}: RunDialogProps): React.ReactElement {
  const [selectedWorkflowPath, setSelectedWorkflowPath] = useState<string>(
    initialWorkflowPath || workflows[0]?.filePath || ''
  );
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId || '');
  const [selectedEvent, setSelectedEvent] = useState<string>('push');
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [payloadJson, setPayloadJson] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | undefined>();
  const [useHostRunner, setUseHostRunner] = useState<boolean>(true);
  const [platformOverride, setPlatformOverride] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const selectedWorkflow = workflows.find((w) => w.filePath === selectedWorkflowPath);

  useEffect(() => {
    if (selectedWorkflow) {
      if (selectedWorkflow.events.includes('workflow_dispatch')) {
        setSelectedEvent('workflow_dispatch');
      } else if (selectedWorkflow.events.length > 0) {
        setSelectedEvent(selectedWorkflow.events[0]);
      } else {
        setSelectedEvent('push');
      }

      const defaults: Record<string, string> = {};
      for (const input of selectedWorkflow.inputs) {
        defaults[input.name] = input.default !== undefined ? String(input.default) : '';
      }
      setInputValues(defaults);
      setSelectedJobId('');
    }
  }, [selectedWorkflowPath, selectedWorkflow]);

  const handleJsonChange = (val: string) => {
    setPayloadJson(val);
    if (!val.trim()) {
      setJsonError(undefined);
      return;
    }
    try {
      JSON.parse(val);
      setJsonError(undefined);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setInputValues((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jsonError || !selectedWorkflowPath) {
      return;
    }

    onRun({
      workflowFilePath: selectedWorkflowPath,
      jobId: selectedJobId.trim().length > 0 ? selectedJobId : undefined,
      event: selectedEvent.trim().length > 0 ? selectedEvent : undefined,
      inputs: Object.keys(inputValues).length > 0 ? inputValues : undefined,
      payloadJson: payloadJson.trim().length > 0 ? payloadJson : undefined,
      platformOverride: platformOverride.trim().length > 0 ? platformOverride : undefined,
      useHostRunner
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        className="Box d-flex flex-column"
        style={{
          width: 520,
          maxWidth: '90vw',
          maxHeight: '90vh',
          backgroundColor: 'var(--color-canvas-overlay, #161b22)',
          borderColor: 'var(--color-border-default, #30363d)',
          borderRadius: 8,
          boxShadow: '0 16px 32px rgba(0,0,0,0.85)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="Box-header d-flex flex-justify-between flex-items-center p-3 border-bottom"
          style={{ borderColor: 'var(--color-border-default, #30363d)' }}
        >
          <h3 className="Box-title f4 text-bold m-0" style={{ color: 'var(--color-fg-default, #c9d1d9)' }}>
            Run workflow
          </h3>
          <button
            type="button"
            className="btn-link"
            onClick={onClose}
            style={{ color: 'var(--color-fg-muted, #8b949e)', fontSize: 16 }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="Box-body p-3" style={{ overflowY: 'auto', flex: 1 }}>
            <div className="form-group mb-3">
              <label className="f6 text-bold d-block mb-1" style={{ color: 'var(--color-fg-default, #c9d1d9)' }}>
                Workflow
              </label>
              <select
                className="form-select width-full"
                value={selectedWorkflowPath}
                onChange={(e) => setSelectedWorkflowPath(e.target.value)}
                style={{
                  backgroundColor: 'var(--color-canvas-default, #0d1117)',
                  color: 'var(--color-fg-default, #c9d1d9)',
                  borderColor: 'var(--color-border-default, #30363d)'
                }}
              >
                {workflows.map((wf) => (
                  <option key={wf.filePath} value={wf.filePath}>
                    {wf.name} ({wf.fileName})
                  </option>
                ))}
              </select>
            </div>

            {selectedWorkflow && selectedWorkflow.jobs.length > 0 && (
              <div className="form-group mb-3">
                <label className="f6 text-bold d-block mb-1" style={{ color: 'var(--color-fg-default, #c9d1d9)' }}>
                  Job (optional)
                </label>
                <select
                  className="form-select width-full"
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  style={{
                    backgroundColor: 'var(--color-canvas-default, #0d1117)',
                    color: 'var(--color-fg-default, #c9d1d9)',
                    borderColor: 'var(--color-border-default, #30363d)'
                  }}
                >
                  <option value="">All jobs in workflow</option>
                  {selectedWorkflow.jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.name} ({job.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group mb-3">
              <label className="f6 text-bold d-block mb-1" style={{ color: 'var(--color-fg-default, #c9d1d9)' }}>
                Event
              </label>
              <input
                type="text"
                className="form-control width-full"
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                style={{
                  backgroundColor: 'var(--color-canvas-default, #0d1117)',
                  color: 'var(--color-fg-default, #c9d1d9)',
                  borderColor: 'var(--color-border-default, #30363d)'
                }}
              />
            </div>

            {selectedWorkflow && selectedWorkflow.inputs.length > 0 && (
              <div className="mb-3 p-3 border rounded-2" style={{ borderColor: 'var(--color-border-default, #30363d)' }}>
                <h4 className="f6 text-bold mb-2" style={{ color: 'var(--color-fg-default, #c9d1d9)' }}>
                  Workflow Inputs
                </h4>
                {selectedWorkflow.inputs.map((input) => {
                  const val = inputValues[input.name] ?? '';

                  return (
                    <div key={input.name} className="form-group mb-2">
                      <label className="f6 d-block mb-1" style={{ color: 'var(--color-fg-default, #c9d1d9)' }}>
                        <span className="text-bold">{input.name}</span>
                        {input.required && <span className="color-fg-danger ml-1">*</span>}
                      </label>
                      {input.description && (
                        <div className="f6 color-fg-subtle mb-1">{input.description}</div>
                      )}

                      {input.type === 'choice' && input.options ? (
                        <select
                          className="form-select width-full"
                          value={val}
                          onChange={(e) => handleInputChange(input.name, e.target.value)}
                          style={{
                            backgroundColor: 'var(--color-canvas-default, #0d1117)',
                            color: 'var(--color-fg-default, #c9d1d9)',
                            borderColor: 'var(--color-border-default, #30363d)'
                          }}
                        >
                          {input.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : input.type === 'boolean' ? (
                        <label className="d-flex flex-items-center gap-2 f6" style={{ cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={val === 'true'}
                            onChange={(e) => handleInputChange(input.name, String(e.target.checked))}
                          />
                          Enable {input.name}
                        </label>
                      ) : (
                        <input
                          type="text"
                          className="form-control width-full"
                          value={val}
                          onChange={(e) => handleInputChange(input.name, e.target.value)}
                          style={{
                            backgroundColor: 'var(--color-canvas-default, #0d1117)',
                            color: 'var(--color-fg-default, #c9d1d9)',
                            borderColor: 'var(--color-border-default, #30363d)'
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mb-2">
              <button
                type="button"
                className="btn-link f6 d-flex flex-items-center gap-1"
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{ color: 'var(--color-accent-fg, #58a6ff)', textDecoration: 'none' }}
              >
                <span>{showAdvanced ? '▾ Hide advanced options' : '▸ Show advanced options'}</span>
              </button>
            </div>

            {showAdvanced && (
              <div className="p-3 border rounded-2 mt-2" style={{ borderColor: 'var(--color-border-default, #30363d)' }}>
                <div className="form-group mb-3">
                  <label className="d-flex flex-items-center gap-2 f6" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={useHostRunner}
                      onChange={(e) => setUseHostRunner(e.target.checked)}
                    />
                    Run on host system (no Docker required)
                  </label>
                </div>

                {!useHostRunner && (
                  <div className="form-group mb-3">
                    <label className="f6 text-bold d-block mb-1" style={{ color: 'var(--color-fg-default, #c9d1d9)' }}>
                      Container image override (optional)
                    </label>
                    <input
                      type="text"
                      className="form-control width-full"
                      placeholder="e.g. catthehacker/ubuntu:act-latest"
                      value={platformOverride}
                      onChange={(e) => setPlatformOverride(e.target.value)}
                      style={{
                        backgroundColor: 'var(--color-canvas-default, #0d1117)',
                        color: 'var(--color-fg-default, #c9d1d9)',
                        borderColor: 'var(--color-border-default, #30363d)'
                      }}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="f6 text-bold d-block mb-1" style={{ color: 'var(--color-fg-default, #c9d1d9)' }}>
                    Event payload JSON
                  </label>
                  <textarea
                    className="form-control width-full font-mono f6"
                    rows={4}
                    placeholder='{"action": "opened"}'
                    value={payloadJson}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    style={{
                      backgroundColor: 'var(--color-canvas-default, #0d1117)',
                      color: 'var(--color-fg-default, #c9d1d9)',
                      borderColor: jsonError ? 'var(--color-danger-fg, #f85149)' : 'var(--color-border-default, #30363d)'
                    }}
                  />
                  {jsonError && (
                    <div className="f6 color-fg-danger mt-1">
                      {jsonError}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div
            className="Box-footer p-3 border-top d-flex flex-justify-end gap-2"
            style={{ borderColor: 'var(--color-border-default, #30363d)' }}
          >
            <button type="button" className="btn btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-sm btn-primary"
              disabled={Boolean(jsonError)}
            >
              Run workflow
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
