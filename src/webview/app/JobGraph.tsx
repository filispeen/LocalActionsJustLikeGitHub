import React, { useMemo } from 'react';
import { RunJob } from '../../runs/types';
import { formatDuration } from './format';
import { StatusIcon } from './StatusIcon';

interface JobGraphProps {
  jobs: RunJob[];
  selectedJobId: string | undefined;
  onSelectJob: (jobId: string) => void;
}

interface NodePosition {
  job: RunJob;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function JobGraph({ jobs, selectedJobId, onSelectJob }: JobGraphProps): React.ReactElement {
  const { positions, width, height, edges } = useMemo(() => {
    if (jobs.length === 0) {
      return { positions: [], width: 200, height: 100, edges: [] };
    }

    const levels = new Map<string, number>();
    const getLevel = (jobId: string, visited: Set<string>): number => {
      if (levels.has(jobId)) {
        return levels.get(jobId)!;
      }
      if (visited.has(jobId)) {
        return 0;
      }
      visited.add(jobId);

      const job = jobs.find((j) => j.id === jobId);
      if (!job || job.needs.length === 0) {
        levels.set(jobId, 0);
        return 0;
      }

      let maxParentLevel = 0;
      for (const parentId of job.needs) {
        maxParentLevel = Math.max(maxParentLevel, getLevel(parentId, visited) + 1);
      }
      levels.set(jobId, maxParentLevel);
      return maxParentLevel;
    };

    for (const job of jobs) {
      getLevel(job.id, new Set());
    }

    const levelGroups = new Map<number, RunJob[]>();
    for (const job of jobs) {
      const lvl = levels.get(job.id) || 0;
      if (!levelGroups.has(lvl)) {
        levelGroups.set(lvl, []);
      }
      levelGroups.get(lvl)!.push(job);
    }

    const nodeWidth = 190;
    const nodeHeight = 44;
    const colSpacing = 60;
    const rowSpacing = 20;

    const nodePositions: NodePosition[] = [];
    const maxLevel = Math.max(...Array.from(levelGroups.keys()), 0);

    let maxColumnHeight = 0;
    for (let lvl = 0; lvl <= maxLevel; lvl++) {
      const group = levelGroups.get(lvl) || [];
      const colHeight = group.length * (nodeHeight + rowSpacing);
      maxColumnHeight = Math.max(maxColumnHeight, colHeight);
    }

    for (let lvl = 0; lvl <= maxLevel; lvl++) {
      const group = levelGroups.get(lvl) || [];
      const x = 30 + lvl * (nodeWidth + colSpacing);
      group.forEach((job, idx) => {
        const y = 30 + idx * (nodeHeight + rowSpacing);
        nodePositions.push({
          job,
          x,
          y,
          width: nodeWidth,
          height: nodeHeight
        });
      });
    }

    const edgeList: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (const targetNode of nodePositions) {
      for (const parentId of targetNode.job.needs) {
        const parentNode = nodePositions.find((n) => n.job.id === parentId);
        if (parentNode) {
          edgeList.push({
            x1: parentNode.x + parentNode.width,
            y1: parentNode.y + parentNode.height / 2,
            x2: targetNode.x,
            y2: targetNode.y + targetNode.height / 2
          });
        }
      }
    }

    const totalWidth = 60 + (maxLevel + 1) * (nodeWidth + colSpacing);
    const totalHeight = Math.max(maxColumnHeight + 60, 100);

    return {
      positions: nodePositions,
      width: totalWidth,
      height: totalHeight,
      edges: edgeList
    };
  }, [jobs]);

  return (
    <div
      className="p-3 border-bottom"
      style={{
        overflowX: 'auto',
        backgroundColor: 'var(--color-canvas-subtle, #161b22)',
        borderColor: 'var(--color-border-default, #30363d)'
      }}
    >
      <div className="f6 text-bold mb-2" style={{ color: 'var(--color-fg-muted, #8b949e)' }}>
        Job graph
      </div>
      <svg width={width} height={height} style={{ display: 'block' }}>
        {edges.map((e, idx) => {
          const dx = Math.abs(e.x2 - e.x1) / 2;
          const pathD = `M ${e.x1} ${e.y1} C ${e.x1 + dx} ${e.y1}, ${e.x2 - dx} ${e.y2}, ${e.x2} ${e.y2}`;
          return (
            <path
              key={idx}
              d={pathD}
              fill="none"
              stroke="var(--color-border-default, #30363d)"
              strokeWidth="2"
            />
          );
        })}

        {positions.map((node) => {
          const isSelected = selectedJobId === node.job.id;
          const duration = formatDuration(node.job.durationMs);

          return (
            <g
              key={node.job.id}
              transform={`translate(${node.x}, ${node.y})`}
              onClick={() => onSelectJob(node.job.id)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                width={node.width}
                height={node.height}
                rx="6"
                fill={
                  isSelected
                    ? 'var(--color-action-list-item-default-selected-bg, #1f242c)'
                    : 'var(--color-canvas-default, #0d1117)'
                }
                stroke={
                  isSelected
                    ? 'var(--color-accent-emphasis, #1f6feb)'
                    : 'var(--color-border-default, #30363d)'
                }
                strokeWidth={isSelected ? '2' : '1'}
              />
              <foreignObject x="8" y="10" width={node.width - 16} height={node.height - 16}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    height: '100%',
                    color: 'var(--color-fg-default, #c9d1d9)',
                    fontSize: 12,
                    userSelect: 'none'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      minWidth: 0,
                      overflow: 'hidden'
                    }}
                  >
                    <StatusIcon status={node.job.status} size={14} />
                    <span
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontWeight: 600
                      }}
                      title={node.job.name}
                    >
                      {node.job.name}
                    </span>
                  </div>
                  {duration && (
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--color-fg-muted, #8b949e)',
                        flexShrink: 0,
                        marginLeft: 4
                      }}
                    >
                      {duration}
                    </span>
                  )}
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
