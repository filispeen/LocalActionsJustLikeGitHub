import React from 'react';
import { RunStatus } from '../../runs/types';

interface StatusIconProps {
  status: RunStatus;
  size?: number;
  muted?: boolean;
}

const MUTED = '#9198a1';

export function StatusIcon({ status, size = 16, muted = false }: StatusIconProps): React.ReactElement {
  const common = { width: size, height: size, viewBox: '0 0 16 16', style: { flexShrink: 0, display: 'block' } as React.CSSProperties };

  switch (status) {
    case 'success':
      return (
        <svg {...common} fill={muted ? MUTED : '#3fb950'} aria-label="success">
          <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16Zm3.78-9.72a.751.751 0 0 0-.018-1.042.751.751 0 0 0-1.042-.018L6.75 9.19 5.28 7.72a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042l2 2a.75.75 0 0 0 1.06 0Z" />
        </svg>
      );

    case 'failure':
      return (
        <svg {...common} fill="#f85149" aria-label="failure">
          <path d="M2.343 13.657A8 8 0 1 1 13.658 2.343 8 8 0 0 1 2.343 13.657ZM6.03 4.97a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042L6.94 8 4.97 9.97a.749.749 0 0 0 .326 1.275.749.749 0 0 0 .734-.215L8 9.06l1.97 1.97a.749.749 0 0 0 1.275-.326.749.749 0 0 0-.215-.734L9.06 8l1.97-1.97a.749.749 0 0 0-.326-1.275.749.749 0 0 0-.734.215L8 6.94Z" />
        </svg>
      );

    case 'in_progress':
      return (
        <svg {...common} fill="none" className="gh-spin" aria-label="in progress">
          <circle cx="8" cy="8" r="6.25" stroke="#d29922" strokeOpacity="0.3" strokeWidth="2" />
          <path d="M8 1.75A6.25 6.25 0 0 1 14.25 8" stroke="#d29922" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'cancelled':
      return (
        <svg {...common} fill={MUTED} aria-label="cancelled">
          <path d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
        </svg>
      );

    case 'skipped':
      return (
        <svg {...common} fill={MUTED} aria-label="skipped">
          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm3.25-.75h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5Z" />
        </svg>
      );

    case 'queued':
    default:
      return (
        <svg {...common} fill="#d29922" aria-label="queued">
          <path d="M8 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
        </svg>
      );
  }
}
