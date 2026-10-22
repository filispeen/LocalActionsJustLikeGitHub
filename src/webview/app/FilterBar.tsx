import React from 'react';
import { RunStatus } from '../../runs/types';

interface FilterBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  statusFilter: RunStatus | 'all';
  onStatusFilterChange: (status: RunStatus | 'all') => void;
  eventFilter: string;
  onEventFilterChange: (event: string) => void;
  availableEvents: string[];
}

export function FilterBar({
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  eventFilter,
  onEventFilterChange,
  availableEvents
}: FilterBarProps): React.ReactElement {
  return (
    <div
      className="p-3 border-bottom d-flex flex-wrap gap-2 flex-items-center"
      style={{
        borderColor: 'var(--color-border-default, #30363d)',
        backgroundColor: 'var(--color-canvas-default, #0d1117)'
      }}
    >
      <input
        type="text"
        className="form-control input-sm flex-1"
        placeholder="Filter runs by title, branch or commit"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        style={{
          minWidth: 200,
          backgroundColor: 'var(--color-canvas-subtle, #161b22)',
          color: 'var(--color-fg-default, #c9d1d9)',
          borderColor: 'var(--color-border-default, #30363d)'
        }}
      />

      <select
        className="form-select select-sm"
        value={eventFilter}
        onChange={(e) => onEventFilterChange(e.target.value)}
        style={{
          backgroundColor: 'var(--color-canvas-subtle, #161b22)',
          color: 'var(--color-fg-default, #c9d1d9)',
          borderColor: 'var(--color-border-default, #30363d)'
        }}
      >
        <option value="all">Event: All</option>
        {availableEvents.map((evt) => (
          <option key={evt} value={evt}>
            Event: {evt}
          </option>
        ))}
      </select>

      <select
        className="form-select select-sm"
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value as RunStatus | 'all')}
        style={{
          backgroundColor: 'var(--color-canvas-subtle, #161b22)',
          color: 'var(--color-fg-default, #c9d1d9)',
          borderColor: 'var(--color-border-default, #30363d)'
        }}
      >
        <option value="all">Status: All</option>
        <option value="success">Status: Success</option>
        <option value="failure">Status: Failure</option>
        <option value="in_progress">Status: In progress</option>
        <option value="queued">Status: Queued</option>
        <option value="cancelled">Status: Cancelled</option>
      </select>
    </div>
  );
}
