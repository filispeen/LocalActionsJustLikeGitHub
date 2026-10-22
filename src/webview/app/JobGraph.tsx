import React, { useMemo } from 'react';
import { RunJob } from '../../runs/types';
import { formatDuration } from './format';
import { StatusIcon } from './StatusIcon';

interface JobGraphProps {
  jobs: RunJob[];
  selectedJobId: string | undefined;
  onSelectJob: (jobId: string) => void;
}

const NODE_W = 220;
const NODE_H = 40;
const COL_GAP = 64;
const ROW_GAP = 16;
const PAD = 8;

export function JobGraph({ jobs, selectedJobId, onSelectJob }: JobGraphProps): React.ReactElement {
  const layout = useMemo(() => {
    const levels = new Map<string, number>();
    const getLevel = (id: string, seen: Set<string>): number => {
      if (levels.has(id)) {
        return levels.get(id)!;
      }
      if (seen.has(id)) {
        return 0;
      }
      seen.add(id);
      const job = jobs.find((j) => j.id === id);
      let lvl = 0;
      for (const parent of job?.needs ?? []) {
        lvl = Math.max(lvl, getLevel(parent, seen) + 1);
      }
      levels.set(id, lvl);
      return lvl;
    };
    jobs.forEach((j) => getLevel(j.id, new Set()));

    const columns = new Map<number, RunJob[]>();
    jobs.forEach((j) => {
      const lvl = levels.get(j.id) ?? 0;
      columns.set(lvl, [...(columns.get(lvl) ?? []), j]);
    });

    const maxLevel = Math.max(0, ...Array.from(columns.keys()));
    const nodes: Array<{ job: RunJob; x: number; y: number }> = [];
    let maxRows = 1;
    for (let lvl = 0; lvl <= maxLevel; lvl++) {
      const col = columns.get(lvl) ?? [];
      maxRows = Math.max(maxRows, col.length);
      col.forEach((job, i) => {
        nodes.push({ job, x: PAD + lvl * (NODE_W + COL_GAP), y: PAD + i * (NODE_H + ROW_GAP) });
      });
    }

    const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (const n of nodes) {
      for (const parentId of n.job.needs) {
        const p = nodes.find((m) => m.job.id === parentId);
        if (p) {
          edges.push({ x1: p.x + NODE_W, y1: p.y + NODE_H / 2, x2: n.x, y2: n.y + NODE_H / 2 });
        }
      }
    }

    return {
      nodes,
      edges,
      width: PAD * 2 + (maxLevel + 1) * NODE_W + maxLevel * COL_GAP,
      height: PAD * 2 + maxRows * NODE_H + (maxRows - 1) * ROW_GAP
    };
  }, [jobs]);

  return (
    <div className="gh-graph">
      <div style={{ position: 'relative', width: layout.width, height: layout.height }}>
        <svg width={layout.width} height={layout.height} style={{ position: 'absolute', inset: 0 }}>
          {layout.edges.map((e, i) => {
            const dx = (e.x2 - e.x1) / 2;
            return (
              <path
                key={i}
                d={`M ${e.x1} ${e.y1} C ${e.x1 + dx} ${e.y1}, ${e.x2 - dx} ${e.y2}, ${e.x2} ${e.y2}`}
                fill="none"
                stroke="#3d444d"
                strokeWidth="1.5"
              />
            );
          })}
        </svg>
        {layout.nodes.map(({ job, x, y }) => {
          const duration = formatDuration(job.durationMs);
          return (
            <button
              type="button"
              key={job.id}
              className={`gh-graph-node ${selectedJobId === job.id ? 'is-active' : ''}`}
              style={{ position: 'absolute', left: x, top: y, width: NODE_W, height: NODE_H }}
              onClick={() => onSelectJob(job.id)}
              title={job.name}
            >
              <StatusIcon status={job.status} size={16} />
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {job.name}
              </span>
              {duration && (
                <span style={{ fontSize: 12, color: 'var(--gh-fg-muted)', flexShrink: 0 }}>{duration}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
