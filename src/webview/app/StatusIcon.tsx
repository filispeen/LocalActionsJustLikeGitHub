import React from 'react';
import { RunStatus } from '../../runs/types';

interface StatusIconProps {
  status: RunStatus;
  size?: number;
}

export function StatusIcon({ status, size = 16 }: StatusIconProps): React.ReactElement {
  switch (status) {
    case 'success':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          style={{ verticalAlign: 'middle', flexShrink: 0 }}
        >
          <circle cx="8" cy="8" r="7" fill="#238636" />
          <path
            d="M5 8.2L7 10.2L11.5 5.8"
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'failure':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          style={{ verticalAlign: 'middle', flexShrink: 0 }}
        >
          <circle cx="8" cy="8" r="7" fill="#da3633" />
          <path
            d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5"
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'in_progress':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          style={{
            verticalAlign: 'middle',
            flexShrink: 0,
            animation: 'spin 1s linear infinite'
          }}
        >
          <style>
            {'@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }'}
          </style>
          <circle cx="8" cy="8" r="6" stroke="#388bfd" strokeWidth="2" strokeDasharray="28 10" />
        </svg>
      );

    case 'cancelled':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          style={{ verticalAlign: 'middle', flexShrink: 0 }}
        >
          <circle cx="8" cy="8" r="7" fill="#6e7681" />
          <path
            d="M4.5 11.5L11.5 4.5"
            stroke="#ffffff"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'queued':
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          style={{ verticalAlign: 'middle', flexShrink: 0 }}
        >
          <circle cx="8" cy="8" r="6" stroke="#8b949e" strokeWidth="2" strokeDasharray="3 3" />
        </svg>
      );
  }
}
