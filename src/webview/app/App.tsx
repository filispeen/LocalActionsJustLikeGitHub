import React, { useEffect, useMemo, useState } from 'react';
import { RunStatus, WorkflowRun } from '../../runs/types';
import { RunWorkflowPayload } from '../../shared/messages';
import { ParsedWorkflow } from '../../workflows/types';
import { FilterBar, RunFilterSelects } from './FilterBar';
import { Header } from './Header';
import { RunDetail } from './RunDetail';
import { RunDialog } from './RunDialog';
import { RunList } from './RunList';
import { Sidebar } from './Sidebar';
import { getVsCodeApi, subscribeToHostMessages } from './vscode';

interface AppState {
  selectedWorkflowPath?: string;
  selectedRunId?: string;
  statusFilter?: RunStatus | 'all';
  eventFilter?: string;
  query?: string;
}

export function App(): React.ReactElement {
  const vscode = getVsCodeApi();
  const savedState = (vscode.getState() as AppState) || {};

  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [workflows, setWorkflows] = useState<ParsedWorkflow[]>([]);
  const [selectedWorkflowPath, setSelectedWorkflowPath] = useState<string | undefined>(
    savedState.selectedWorkflowPath
  );
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>(savedState.selectedRunId);
  const [statusFilter, setStatusFilter] = useState<RunStatus | 'all'>(
    savedState.statusFilter || 'all'
  );
  const [eventFilter, setEventFilter] = useState<string>(savedState.eventFilter || 'all');
  const [query, setQuery] = useState<string>(savedState.query || '');

  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogWorkflowPath, setDialogWorkflowPath] = useState<string | undefined>();
  const [dialogJobId, setDialogJobId] = useState<string | undefined>();
  const [logsByRunId, setLogsByRunId] = useState<Record<string, string>>({});

  useEffect(() => {
    vscode.setState({
      selectedWorkflowPath,
      selectedRunId,
      statusFilter,
      eventFilter,
      query
    });
  }, [selectedWorkflowPath, selectedRunId, statusFilter, eventFilter, query, vscode]);

  useEffect(() => {
    const unsubscribe = subscribeToHostMessages((msg) => {
      switch (msg.type) {
        case 'init':
          setRuns(msg.runs);
          setWorkflows(msg.workflows);
          break;

        case 'runsUpdated':
          setRuns(msg.runs);
          break;

        case 'runUpdated':
          setRuns((prev) => {
            const idx = prev.findIndex((r) => r.id === msg.run.id);
            if (idx !== -1) {
              const updated = [...prev];
              updated[idx] = msg.run;
              return updated;
            }
            return [msg.run, ...prev];
          });
          break;

        case 'workflowsUpdated':
          setWorkflows(msg.workflows);
          break;

        case 'openRunDialog':
          setDialogWorkflowPath(msg.workflowFilePath);
          setDialogJobId(msg.jobId);
          setDialogOpen(true);
          break;

        case 'logChunk':
          setLogsByRunId((prev) => ({ ...prev, [msg.runId]: msg.log }));
          break;

        case 'logAppended':
          setLogsByRunId((prev) => {
            const current = prev[msg.runId] || '';
            const next = current + (current.endsWith('\n') || !current ? '' : '\n') + msg.line;
            return { ...prev, [msg.runId]: next };
          });
          break;
      }
    });

    vscode.postMessage({ type: 'ready' });
    return unsubscribe;
  }, [vscode]);

  const selectedWorkflow = useMemo(
    () => workflows.find((w) => w.filePath === selectedWorkflowPath),
    [workflows, selectedWorkflowPath]
  );

  const selectedRun = useMemo(
    () => runs.find((r) => r.id === selectedRunId),
    [runs, selectedRunId]
  );

  const availableEvents = useMemo(() => {
    const set = new Set<string>();
    for (const r of runs) {
      if (r.event) {
        set.add(r.event);
      }
    }
    for (const w of workflows) {
      for (const e of w.events) {
        set.add(e);
      }
    }
    return Array.from(set).sort();
  }, [runs, workflows]);

  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      if (selectedWorkflowPath && run.workflowFilePath !== selectedWorkflowPath) {
        return false;
      }
      if (statusFilter !== 'all' && run.status !== statusFilter) {
        return false;
      }
      if (eventFilter !== 'all' && run.event !== eventFilter) {
        return false;
      }
      if (query.trim().length > 0) {
        const q = query.toLowerCase();
        const matchTitle = run.workflowName.toLowerCase().includes(q);
        const matchBranch = run.branch?.toLowerCase().includes(q) ?? false;
        const matchSha = run.commitSha?.toLowerCase().includes(q) ?? false;
        const matchId = run.id.toLowerCase().includes(q);
        if (!matchTitle && !matchBranch && !matchSha && !matchId) {
          return false;
        }
      }
      return true;
    });
  }, [runs, selectedWorkflowPath, statusFilter, eventFilter, query]);

  const runNumbers = useMemo(() => {
    const byWorkflow = new Map<string, WorkflowRun[]>();
    for (const r of runs) {
      byWorkflow.set(r.workflowFilePath, [...(byWorkflow.get(r.workflowFilePath) ?? []), r]);
    }
    const out: Record<string, number> = {};
    for (const list of byWorkflow.values()) {
      [...list]
        .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
        .forEach((r, i) => {
          out[r.id] = i + 1;
        });
    }
    return out;
  }, [runs]);

  const handleOpenRunDialog = (filePath?: string, jobId?: string) => {
    setDialogWorkflowPath(filePath || selectedWorkflowPath);
    setDialogJobId(jobId);
    setDialogOpen(true);
  };

  const handleExecuteRun = (payload: RunWorkflowPayload) => {
    vscode.postMessage({ type: 'runWorkflow', options: payload });
  };

  const handleCancelRun = (runId: string) => {
    vscode.postMessage({ type: 'cancelRun', runId });
  };

  const handleDeleteRun = (runId: string) => {
    vscode.postMessage({ type: 'deleteRun', runId });
  };

  const handleOpenFile = (filePath: string) => {
    vscode.postMessage({ type: 'openWorkflowFile', filePath });
  };

  return (
    <div className="gh-app">
      {!selectedRun && (
        <Sidebar
          workflows={workflows}
          runs={runs}
          selectedWorkflowPath={selectedWorkflowPath}
          onSelectWorkflow={(path) => {
            setSelectedWorkflowPath(path);
            setSelectedRunId(undefined);
          }}
        />
      )}

      <main className="gh-main">
        {selectedRun ? (
          <RunDetail
            key={selectedRun.id}
            run={selectedRun}
            runNumber={runNumbers[selectedRun.id]}
            logs={logsByRunId[selectedRun.id] ?? ''}
            onBack={() => setSelectedRunId(undefined)}
            onOpenFile={handleOpenFile}
          />
        ) : (
          <div className="gh-page">
            <Header
              selectedWorkflow={selectedWorkflow}
              workflows={workflows}
              onRunWorkflow={(filePath) => handleOpenRunDialog(filePath)}
              onOpenFile={handleOpenFile}
            />

            {selectedWorkflow && !selectedWorkflow.isValid && (
              <div className="gh-flash gh-flash-error" role="alert">
                <div>
                  <strong>Invalid workflow definition: </strong>
                  <span>{selectedWorkflow.error}</span>
                </div>
                <button type="button" className="gh-btn gh-btn-sm" onClick={() => handleOpenFile(selectedWorkflow.filePath)}>
                  Edit file
                </button>
              </div>
            )}

            {workflows.length === 0 && (
              <div className="gh-flash gh-flash-warn" role="status">
                <span>
                  <strong>No workflows found: </strong>
                  Add GitHub Actions YAML files to <code>.github/workflows</code> to run them locally.
                </span>
              </div>
            )}

            <FilterBar query={query} onQueryChange={setQuery} />

            <RunList
              runs={filteredRuns}
              runNumbers={runNumbers}
              selectedRunId={selectedRunId}
              onSelectRun={(run) => setSelectedRunId(run.id)}
              onCancelRun={handleCancelRun}
              onDeleteRun={handleDeleteRun}
              filters={
                <RunFilterSelects
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  eventFilter={eventFilter}
                  onEventFilterChange={setEventFilter}
                  availableEvents={availableEvents}
                />
              }
            />
          </div>
        )}

        {dialogOpen && (
          <RunDialog
            workflows={workflows.filter((w) => w.isValid)}
            initialWorkflowPath={dialogWorkflowPath}
            initialJobId={dialogJobId}
            onClose={() => setDialogOpen(false)}
            onRun={handleExecuteRun}
          />
        )}
      </main>
    </div>
  );
}
