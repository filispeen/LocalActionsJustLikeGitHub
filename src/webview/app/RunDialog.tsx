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
    <div className="gh-overlay" onClick={onClose}>
      <div className="gh-dialog" role="dialog" aria-label="Run workflow" onClick={(e) => e.stopPropagation()}>
        <div className="gh-dialog-head">
          <h3>Run workflow</h3>
          <button type="button" className="gh-btn gh-btn-sm gh-btn-invisible gh-btn-icon" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="gh-dialog-form">
          <div className="gh-dialog-body">
            <div className="gh-field">
              <label className="gh-label">Workflow</label>
              <select className="gh-input" value={selectedWorkflowPath} onChange={(e) => setSelectedWorkflowPath(e.target.value)}>
                {workflows.map((wf) => (
                  <option key={wf.filePath} value={wf.filePath}>
                    {wf.name} ({wf.fileName})
                  </option>
                ))}
              </select>
            </div>

            {selectedWorkflow && selectedWorkflow.jobs.length > 0 && (
              <div className="gh-field">
                <label className="gh-label">Job (optional)</label>
                <select className="gh-input" value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}>
                  <option value="">All jobs in workflow</option>
                  {selectedWorkflow.jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.name} ({job.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="gh-field">
              <label className="gh-label">Event</label>
              <input type="text" className="gh-input" value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} />
            </div>

            {selectedWorkflow && selectedWorkflow.inputs.length > 0 && (
              <div className="gh-group">
                <div className="gh-label">Workflow Inputs</div>
                {selectedWorkflow.inputs.map((input) => {
                  const val = inputValues[input.name] ?? '';

                  return (
                    <div key={input.name} className="gh-field">
                      <label className="gh-label">
                        {input.name}
                        {input.required && <span style={{ color: 'var(--gh-danger)', marginLeft: 4 }}>*</span>}
                      </label>
                      {input.description && <div className="gh-hint">{input.description}</div>}

                      {input.type === 'choice' && input.options ? (
                        <select className="gh-input" value={val} onChange={(e) => handleInputChange(input.name, e.target.value)}>
                          {input.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : input.type === 'boolean' ? (
                        <label className="gh-check" style={{ fontSize: 14, color: 'var(--gh-fg)' }}>
                          <input
                            type="checkbox"
                            checked={val === 'true'}
                            onChange={(e) => handleInputChange(input.name, String(e.target.checked))}
                          />
                          Enable {input.name}
                        </label>
                      ) : (
                        <input type="text" className="gh-input" value={val} onChange={(e) => handleInputChange(input.name, e.target.value)} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="gh-field">
              <button type="button" className="gh-link" onClick={() => setShowAdvanced(!showAdvanced)}>
                {showAdvanced ? '▾ Hide advanced options' : '▸ Show advanced options'}
              </button>
            </div>

            {showAdvanced && (
              <div className="gh-group">
                <div className="gh-field">
                  <label className="gh-check" style={{ fontSize: 14, color: 'var(--gh-fg)' }}>
                    <input type="checkbox" checked={useHostRunner} onChange={(e) => setUseHostRunner(e.target.checked)} />
                    Run on host system (no Docker required)
                  </label>
                </div>

                {!useHostRunner && (
                  <div className="gh-field">
                    <label className="gh-label">Container image override (optional)</label>
                    <input
                      type="text"
                      className="gh-input"
                      placeholder="e.g. catthehacker/ubuntu:act-latest"
                      value={platformOverride}
                      onChange={(e) => setPlatformOverride(e.target.value)}
                    />
                  </div>
                )}

                <div className="gh-field">
                  <label className="gh-label">Event payload JSON</label>
                  <textarea
                    className="gh-input gh-textarea"
                    rows={4}
                    placeholder='{"action": "opened"}'
                    value={payloadJson}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    style={jsonError ? { borderColor: 'var(--gh-danger)' } : undefined}
                  />
                  {jsonError && <div className="gh-hint" style={{ color: 'var(--gh-danger)' }}>{jsonError}</div>}
                </div>
              </div>
            )}
          </div>

          <div className="gh-dialog-foot">
            <button type="button" className="gh-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="gh-btn gh-btn-primary" disabled={Boolean(jsonError)}>
              Run workflow
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
