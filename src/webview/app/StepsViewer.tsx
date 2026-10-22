import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RunJob } from '../../runs/types';
import { parseAnsi } from './ansi';
import { formatDuration, formatRelativeTime } from './format';
import { StatusIcon } from './StatusIcon';
import { cleanLogLine, extractStepsFromLogs, partitionJobLogs } from './stepLogs';

interface StepsViewerProps {
  job: RunJob | undefined;
  rawLogs: string;
  isRunActive: boolean;
}

const MAX_STEP_LINES = 2000;

function LogLine({ num, text }: { num: number; text: string }): React.ReactElement {
  const segments = parseAnsi(text);
  return (
    <div className="gh-log-line">
      <span className="gh-log-num">{num}</span>
      <span className="gh-log-text">
        {segments.map((seg, i) => (
          <span key={i} style={{ color: seg.color || 'var(--gh-fg)', fontWeight: seg.bold ? 700 : 400 }}>
            {seg.text}
          </span>
        ))}
      </span>
    </div>
  );
}

export function StepsViewer({ job, rawLogs, isRunActive }: StepsViewerProps): React.ReactElement {
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'steps' | 'raw'>('steps');

  const logsEndRef = useRef<HTMLDivElement>(null);

  const parsedLines = useMemo(() => {
    if (!rawLogs) {
      return [];
    }
    return rawLogs.split(/\r?\n/).filter((l) => l.trim().length > 0);
  }, [rawLogs]);

  const steps = useMemo(() => {
    if (job?.steps && job.steps.length > 0) {
      return job.steps;
    }
    return extractStepsFromLogs(parsedLines);
  }, [job?.steps, parsedLines]);

  const stepLogsMap = useMemo(() => {
    if (!job || steps.length === 0) {
      return {} as Record<string, string[]>;
    }
    return partitionJobLogs(parsedLines, job.name, steps);
  }, [parsedLines, job, steps]);

  useEffect(() => {
    if (steps.length > 0) {
      setExpandedSteps((prev) => {
        const next = { ...prev };
        for (const step of steps) {
          if (next[step.id] === undefined) {
            next[step.id] = step.status === 'in_progress' || step.status === 'failure';
          }
        }
        return next;
      });
    }
  }, [steps]);

  useEffect(() => {
    if (autoScroll && isRunActive && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [autoScroll, isRunActive, rawLogs]);

  if (!job) {
    return <div className="gh-empty">Select a job to inspect steps and logs.</div>;
  }

  const matches = (line: string) => !searchQuery || line.toLowerCase().includes(searchQuery.toLowerCase());
  const toggleStep = (id: string) => setExpandedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  const handleCopy = () => {
    navigator.clipboard.writeText(rawLogs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const jobDuration = formatDuration(job.durationMs);
  const jobWord = job.status === 'success' ? 'succeeded' : job.status === 'failure' ? 'failed' : job.status === 'in_progress' ? 'in progress' : job.status;

  return (
    <div className="gh-box">
      <div className="gh-job-head">
        <div>
          <h2>{job.name}</h2>
          <div className="gh-job-sub">
            {jobWord}
            {job.startedAt ? ` ${formatRelativeTime(job.startedAt)}` : ''}
            {jobDuration ? ` in ${jobDuration}` : ''}
          </div>
        </div>

        <div className="gh-job-tools">
          <input
            type="text"
            className="gh-input gh-input-sm"
            placeholder="Search logs"
            aria-label="Search logs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 200 }}
          />
          <label className="gh-check">
            <input type="checkbox" checked={showTimestamps} onChange={(e) => setShowTimestamps(e.target.checked)} />
            Timestamps
          </label>
          <label className="gh-check">
            <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
            Auto-scroll
          </label>
          {steps.length > 0 && (
            <button
              type="button"
              className="gh-btn gh-btn-sm"
              onClick={() => setViewMode((m) => (m === 'steps' ? 'raw' : 'steps'))}
            >
              {viewMode === 'steps' ? 'View raw logs' : 'View steps'}
            </button>
          )}
          <button type="button" className="gh-btn gh-btn-sm" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy log'}
          </button>
        </div>
      </div>

      {viewMode === 'raw' || steps.length === 0 ? (
        <div className="gh-raw">
          {parsedLines.map((line, idx) => (matches(line) ? <LogLine key={idx} num={idx + 1} text={line} /> : null))}
          <div ref={logsEndRef} />
        </div>
      ) : (
        <div className="gh-steps">
          {steps.map((step) => {
            const isOpen = Boolean(expandedSteps[step.id]);
            const duration = formatDuration(step.durationMs);
            const all = (stepLogsMap[step.id] || []).filter(matches);
            const capped = all.length > MAX_STEP_LINES;
            const lines = capped ? all.slice(-MAX_STEP_LINES) : all;
            const offset = all.length - lines.length;

            return (
              <div key={step.id} className={`gh-step ${isOpen ? 'is-open' : ''}`}>
                <div
                  className="gh-step-head"
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onClick={() => toggleStep(step.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleStep(step.id);
                    }
                  }}
                >
                  <svg className="gh-step-chevron" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                  <StatusIcon status={step.status} size={16} muted={step.status === 'success'} />
                  <span className="gh-step-name">{step.name}</span>
                  {duration && <span className="gh-step-time">{duration}</span>}
                </div>

                {isOpen && (
                  <div className="gh-log">
                    {all.length === 0 ? (
                      <div className="gh-log-note">No output produced for this step yet.</div>
                    ) : (
                      <>
                        {capped && (
                          <div className="gh-log-note">
                            Showing latest {MAX_STEP_LINES.toLocaleString()} of {all.length.toLocaleString()} lines
                          </div>
                        )}
                        {lines.map((line, idx) => (
                          <LogLine key={idx} num={offset + idx + 1} text={cleanLogLine(line, job.name)} />
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
}
