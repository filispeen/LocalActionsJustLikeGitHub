import React from 'react';
import { RunStatus } from '../../runs/types';

interface FilterBarProps {
  query: string;
  onQueryChange: (query: string) => void;
}

export function FilterBar({ query, onQueryChange }: FilterBarProps): React.ReactElement {
  return (
    <input
      type="text"
      className="gh-input gh-search"
      placeholder="Filter runs by title, branch or commit"
      aria-label="Filter runs"
      value={query}
      onChange={(e) => onQueryChange(e.target.value)}
    />
  );
}

export interface RunFilterSelectsProps {
  statusFilter: RunStatus | 'all';
  onStatusFilterChange: (status: RunStatus | 'all') => void;
  eventFilter: string;
  onEventFilterChange: (event: string) => void;
  availableEvents: string[];
}

export function RunFilterSelects({
  statusFilter,
  onStatusFilterChange,
  eventFilter,
  onEventFilterChange,
  availableEvents
}: RunFilterSelectsProps): React.ReactElement {
  return (
    <div className="gh-filters">
      <select
        className="gh-select"
        aria-label="Event"
        value={eventFilter}
        onChange={(e) => onEventFilterChange(e.target.value)}
      >
        <option value="all">Event</option>
        {availableEvents.map((evt) => (
          <option key={evt} value={evt}>
            {evt}
          </option>
        ))}
      </select>
      <select
        className="gh-select"
        aria-label="Status"
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value as RunStatus | 'all')}
      >
        <option value="all">Status</option>
        <option value="success">Success</option>
        <option value="failure">Failure</option>
        <option value="in_progress">In progress</option>
        <option value="queued">Queued</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>
  );
}
