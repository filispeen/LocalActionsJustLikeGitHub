export interface AnsiSegment {
  text: string;
  color?: string;
  bold?: boolean;
}

const COLOR_MAP: Record<number, string> = {
  30: '#484f58',
  31: '#ff7b72',
  32: '#3fb950',
  33: '#d29922',
  34: '#58a6ff',
  35: '#bc8cff',
  36: '#39c5cf',
  37: '#b1bac4',
  90: '#6e7681',
  91: '#ffa198',
  92: '#56d364',
  93: '#e3b341',
  94: '#79c0ff',
  95: '#d2a8ff',
  96: '#56d4dd',
  97: '#f0f6fc'
};

export function parseAnsi(text: string): AnsiSegment[] {
  const segments: AnsiSegment[] = [];
  const regex = new RegExp('\x1b\\[([0-9;]*)m', 'g');

  let lastIndex = 0;
  let currentColor: string | undefined;
  let currentBold = false;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const part = text.substring(lastIndex, match.index);
      if (part.length > 0) {
        segments.push({
          text: part,
          color: currentColor,
          bold: currentBold
        });
      }
    }

    const codeStr = match[1] || '0';
    const codes = codeStr.split(';').map(Number);

    for (const code of codes) {
      if (code === 0) {
        currentColor = undefined;
        currentBold = false;
      } else if (code === 1) {
        currentBold = true;
      } else if (COLOR_MAP[code]) {
        currentColor = COLOR_MAP[code];
      }
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    const remaining = text.substring(lastIndex);
    if (remaining.length > 0) {
      segments.push({
        text: remaining,
        color: currentColor,
        bold: currentBold
      });
    }
  }

  return segments;
}
