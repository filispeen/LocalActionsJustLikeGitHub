import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RunJob } from '../../runs/types';
import { parseAnsi } from './ansi';
import { formatDuration } from './format';
import { StatusIcon } from './StatusIcon';

interface StepsViewerProps {
  job: RunJob | undefined;
  rawLogs: string;
  isRunActive: boolean;
}

export function StepsViewer({ job, rawLogs, isRunActive }: StepsViewerProps): React.ReactElement {
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  const parsedLines = useMemo(() => {
    if (!rawLogs) {
      return [];
    }
    return rawLogs.split(/\r?\n/).filter((l) => l.trim().length > 0);
  }, [rawLogs]);

  useEffect(() => {
    if (job?.steps) {
      setExpandedSteps((prev) => {
        const next = { ...prev };
        for (const step of job.steps) {
          if (next[step.id] === undefined) {
            next[step.id] = step.status === 'in_progress' || step.status === 'failure';
          }
        }
        return next;
      });
    }
  }, [job]);

  useEffect(() => {
    if (autoScroll && isRunActive && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [autoScroll, isRunActive, rawLogs]);

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(rawLogs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!job) {
    return (
      <div className="p-6 text-center" style={{ color: 'var(--color-fg-muted, #8b949e)' }}>
        Select a job from above to inspect steps and logs.
      </div>
    );
  }

  const steps = job.steps.length > 0 ? job.steps : [];

  return (
    <div className="d-flex flex-column flex-1 min-width-0" style={{ overflow: 'hidden' }}>
      <div
        className="p-2 border-bottom d-flex flex-wrap flex-items-center flex-justify-between gap-2"
        style={{
          backgroundColor: 'var(--color-canvas-default, #0d1117)',
          borderColor: 'var(--color-border-default, #30363d)'
        }}
      >
        <div className="d-flex flex-items-center gap-2">
          <input
            type="text"
            className="form-control input-sm"
            placeholder="Search logs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: 180,
              backgroundColor: 'var(--color-canvas-subtle, #161b22)',
              color: 'var(--color-fg-default, #c9d1d9)',
              borderColor: 'var(--color-border-default, #30363d)'
            }}
          />
          <label
            className="f6 d-flex flex-items-center gap-1"
            style={{ color: 'var(--color-fg-muted, #8b949e)', cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              checked={showTimestamps}
              onChange={(e) => setShowTimestamps(e.target.checked)}
            />
            Timestamps
          </label>
          <label
            className="f6 d-flex flex-items-center gap-1"
            style={{ color: 'var(--color-fg-muted, #8b949e)', cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>
        </div>

        <button
          type="button"
          className="btn btn-sm"
          onClick={handleCopy}
          style={{
            backgroundColor: 'var(--color-btn-bg, #21262d)',
            color: 'var(--color-fg-default, #c9d1d9)',
            borderColor: 'var(--color-btn-border, #30363d)'
          }}
        >
          {copied ? 'Copied!' : 'Copy log'}
        </button>
      </div>

      <div className="flex-1 p-3" style={{ overflowY: 'auto' }}>
        {steps.length === 0 ? (
          <div
            className="p-3 font-mono f6 border rounded-2"
            style={{
              backgroundColor: 'var(--color-canvas-subtle, #161b22)',
              borderColor: 'var(--color-border-default, #30363d)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}
          >
            {parsedLines.map((line, idx) => {
              if (searchQuery && !line.toLowerCase().includes(searchQuery.toLowerCase())) {
                return null;
              }
              const segments = parseAnsi(line);
              return (
                <div key={idx} style={{ lineHeight: '1.6' }}>
                  {segments.map((seg, sIdx) => (
                    <span
                      key={sIdx}
                      style={{
                        color: seg.color || 'var(--color-fg-default, #c9d1d9)',
                        fontWeight: seg.bold ? 700 : 400
                      }}
                    >
                      {seg.text}
                    </span>
                  ))}
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {steps.map((step) => {
              const isExpanded = Boolean(expandedSteps[step.id]);
              const duration = formatDuration(step.durationMs);

              return (
                <div
                  key={step.id}
                  className="border rounded-2"
                  style={{
                    backgroundColor: 'var(--color-canvas-default, #0d1117)',
                    borderColor: 'var(--color-border-default, #30363d)',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    className="p-2 d-flex flex-items-center flex-justify-between"
                    style={{
                      cursor: 'pointer',
                      backgroundColor: 'var(--color-canvas-subtle, #161b22)',
                      userSelect: 'none'
                    }}
                    onClick={() => toggleStep(step.id)}
                  >
                    <div className="d-flex flex-items-center gap-2">
                      <span
                        style={{
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.15s ease',
                          display: 'inline-block',
                          fontSize: 10,
                          color: 'var(--color-fg-muted, #8b949e)'
                        }}
                      >
                        ▶
                      </span>
                      <StatusIcon status={step.status} size={14} />
                      <span className="f6 text-bold" style={{ color: 'var(--color-fg-default, #c9d1d9)' }}>
                        {step.name}
                      </span>
                    </div>

                    {duration && (
                      <span className="f6" style={{ color: 'var(--color-fg-muted, #8b949e)' }}>
                        {duration}
                      </span>
                    )}
                  </div>

                  {isExpanded && (
                    <div
                      className="p-3 font-mono f6 border-top"
                      style={{
                        backgroundColor: '#05070a',
                        borderColor: 'var(--color-border-default, #30363d)',
                        maxHeight: 400,
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all'
                      }}
                    >
                      {parsedLines.length === 0 ? (
                        <span style={{ color: 'var(--color-fg-muted, #8b949e)' }}>
                          No output produced for this step yet.
                        </span>
                      ) : (
                        parsedLines
                          .filter((line) => {
                            if (searchQuery && !line.toLowerCase().includes(searchQuery.toLowerCase())) {
                              return false;
                            }
                            return true;
                          })
                          .slice(-500)
                          .map((line, idx) => {
                            const segments = parseAnsi(line);
                            return (
                              <div key={idx} style={{ lineHeight: '1.6' }}>
                                {segments.map((seg, sIdx) => (
                                  <span
                                    key={sIdx}
                                    style={{
                                      color: seg.color || 'var(--color-fg-default, #c9d1d9)',
                                      fontWeight: seg.bold ? 700 : 400
                                    }}
                                  >
                                    {seg.text}
                                  </span>
                                ))}
                              </div>
                            );
                          })
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
    </div>
  );
}
