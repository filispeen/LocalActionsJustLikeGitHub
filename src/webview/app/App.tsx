import React, { useEffect, useMemo, useState } from 'react';
import { RunStatus, WorkflowRun } from '../../runs/types';
import { RunWorkflowPayload } from '../../shared/messages';
import { ParsedWorkflow } from '../../workflows/types';
import { FilterBar } from './FilterBar';
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
    <div
      className="d-flex flex-row width-full height-full"
      style={{
        height: '100vh',
        backgroundColor: 'var(--color-canvas-default, #0d1117)',
        color: 'var(--color-fg-default, #c9d1d9)',
        overflow: 'hidden'
      }}
    >
      <Sidebar
        workflows={workflows}
        runs={runs}
        selectedWorkflowPath={selectedWorkflowPath}
        onSelectWorkflow={(path) => {
          setSelectedWorkflowPath(path);
          setSelectedRunId(undefined);
        }}
      />

      <main className="d-flex flex-column flex-1 min-width-0 height-full">
        {selectedRun ? (
          <RunDetail
            run={selectedRun}
            onBack={() => setSelectedRunId(undefined)}
            onRunWorkflow={(filePath, jobId) => handleOpenRunDialog(filePath, jobId)}
          />
        ) : (
          <>
            <Header
              selectedWorkflow={selectedWorkflow}
              workflows={workflows}
              onRunWorkflow={(filePath) => handleOpenRunDialog(filePath)}
              onOpenFile={handleOpenFile}
            />

            {selectedWorkflow && !selectedWorkflow.isValid && (
              <div
                className="flash flash-error m-3 d-flex flex-justify-between flex-items-center"
                role="alert"
              >
                <div>
                  <strong>Invalid workflow definition: </strong>
                  <span>{selectedWorkflow.error}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => handleOpenFile(selectedWorkflow.filePath)}
                >
                  Edit file
                </button>
              </div>
            )}

            {workflows.length === 0 && (
              <div className="flash flash-warn m-3" role="status">
                <strong>No workflows found: </strong>
                <span>Add GitHub Actions YAML files to <code>.github/workflows</code> to run them locally.</span>
              </div>
            )}

            <FilterBar
              query={query}
              onQueryChange={setQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              eventFilter={eventFilter}
              onEventFilterChange={setEventFilter}
              availableEvents={availableEvents}
            />

            <RunList
              runs={filteredRuns}
              selectedRunId={selectedRunId}
              onSelectRun={(run) => setSelectedRunId(run.id)}
              onCancelRun={handleCancelRun}
              onDeleteRun={handleDeleteRun}
            />
          </>
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
