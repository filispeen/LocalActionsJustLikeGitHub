import { describe, expect, it } from 'vitest';
import { parseAnsi } from '../../src/webview/app/ansi';

describe('parseAnsi', () => {
  it('returns plain text when no escape codes exist', () => {
    const text = 'Hello world';
    const segments = parseAnsi(text);
    expect(segments).toEqual([{ text: 'Hello world', color: undefined, bold: false }]);
  });

  it('parses green text code', () => {
    const text = '\u001b[32mSuccess\u001b[0m';
    const segments = parseAnsi(text);
    expect(segments).toEqual([
      { text: 'Success', color: '#3fb950', bold: false }
    ]);
  });

  it('parses bold red text', () => {
    const text = '\u001b[1;31mError\u001b[0m';
    const segments = parseAnsi(text);
    expect(segments[0]).toEqual({ text: 'Error', color: '#ff7b72', bold: true });
  });

  it('handles multiple colored sections', () => {
    const text = 'prefix \u001b[34mblue\u001b[0m middle \u001b[33myellow\u001b[0m';
    const segments = parseAnsi(text);
    expect(segments.length).toBeGreaterThan(2);
    expect(segments.find((s) => s.text === 'blue')?.color).toBe('#58a6ff');
    expect(segments.find((s) => s.text === 'yellow')?.color).toBe('#d29922');
  });
});
