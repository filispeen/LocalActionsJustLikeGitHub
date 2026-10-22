import { describe, expect, it } from 'vitest';
import { formatDuration, formatRelativeTime } from '../../src/webview/app/format';

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(4000)).toBe('4s');
    expect(formatDuration(500)).toBe('1s');
    expect(formatDuration(100)).toBe('0s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(74000)).toBe('1m 14s');
    expect(formatDuration(120000)).toBe('2m 0s');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(3660000)).toBe('1h 1m');
  });

  it('handles undefined or null', () => {
    expect(formatDuration(undefined)).toBe('');
  });
});

describe('formatRelativeTime', () => {
  it('returns just now for very recent times', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('just now');
  });

  it('returns seconds ago', () => {
    const past = new Date(Date.now() - 30000).toISOString();
    expect(formatRelativeTime(past)).toBe('30s ago');
  });

  it('returns minutes ago', () => {
    const past = new Date(Date.now() - 180000).toISOString();
    expect(formatRelativeTime(past)).toBe('3m ago');
  });
});
