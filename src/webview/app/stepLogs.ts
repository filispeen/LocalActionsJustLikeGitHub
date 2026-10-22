import { RunStep } from '../../runs/types';

export function cleanLogLine(line: string, jobName?: string): string {
  const cleaned = line;
  if (jobName) {
    const jobPrefix1 = `[${jobName}]   | `;
    const jobPrefix2 = `[${jobName}] | `;
    const jobPrefix3 = `[${jobName}]   `;
    const jobPrefix4 = `[${jobName}] `;
    if (cleaned.startsWith(jobPrefix1)) {
      return cleaned.substring(jobPrefix1.length);
    }
    if (cleaned.startsWith(jobPrefix2)) {
      return cleaned.substring(jobPrefix2.length);
    }
    if (cleaned.startsWith(jobPrefix3)) {
      return cleaned.substring(jobPrefix3.length);
    }
    if (cleaned.startsWith(jobPrefix4)) {
      return cleaned.substring(jobPrefix4.length);
    }
  }

  const genericPrefix = /^\[[^\]]+\]\s*(\|\s*)?/;
  if (genericPrefix.test(cleaned)) {
    return cleaned.replace(genericPrefix, '');
  }

  return cleaned;
}

export function extractStepsFromLogs(allLines: string[]): RunStep[] {
  const steps: RunStep[] = [];
  const seen = new Set<string>();

  for (const rawLine of allLines) {
    const line = rawLine.trim();
    const runMatch = line.match(/⭐\s*Run\s+(.+)$/);
    if (runMatch) {
      const stepTarget = runMatch[1].trim();
      const cleanTarget = stepTarget.replace(/^(Main|Post|Pre)\s+/, '').trim();
      if (!seen.has(cleanTarget)) {
        seen.add(cleanTarget);
        steps.push({
          id: cleanTarget,
          name: cleanTarget,
          status: 'success',
          logLinesCount: 0
        });
      }
    }

    const failMatch = line.match(/❌\s*Failure\s*-\s*([^[]+)(?:\s*\[([0-9.]+)(s|ms)\])?/);
    if (failMatch) {
      const stepTarget = failMatch[1].trim();
      const cleanTarget = stepTarget.replace(/^(Main|Post|Pre)\s+/, '').trim();
      const step = steps.find((s) => s.name === cleanTarget || s.id === cleanTarget);
      if (step) {
        step.status = 'failure';
        if (failMatch[2]) {
          const val = parseFloat(failMatch[2]);
          step.durationMs = failMatch[3] === 's' ? Math.round(val * 1000) : Math.round(val);
        }
      }
    }

    const succMatch = line.match(/✅\s*Success\s*-\s*([^[]+)(?:\s*\[([0-9.]+)(s|ms)\])?/);
    if (succMatch) {
      const stepTarget = succMatch[1].trim();
      const cleanTarget = stepTarget.replace(/^(Main|Post|Pre)\s+/, '').trim();
      const step = steps.find((s) => s.name === cleanTarget || s.id === cleanTarget);
      if (step && succMatch[2]) {
        const val = parseFloat(succMatch[2]);
        step.durationMs = succMatch[3] === 's' ? Math.round(val * 1000) : Math.round(val);
      }
    }
  }

  return steps;
}

export function partitionJobLogs(
  allLines: string[],
  jobName: string,
  steps: RunStep[]
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const step of steps) {
    result[step.id] = [];
  }

  if (steps.length === 0 || allLines.length === 0) {
    return result;
  }

  let currentStepId: string | undefined = steps[0]?.id;

  for (const rawLine of allLines) {
    const line = rawLine.trim();

    const runMatch = line.match(/⭐\s*Run\s+(.+)$/);
    if (runMatch) {
      const stepTarget = runMatch[1].trim();
      const cleanTarget = stepTarget.replace(/^(Main|Post|Pre)\s+/, '').trim();

      const matched =
        steps.find(
          (s) =>
            s.name === stepTarget ||
            s.name === cleanTarget ||
            s.id === stepTarget ||
            s.id === cleanTarget
        ) ||
        steps.find(
          (s) =>
            s.name.toLowerCase() === cleanTarget.toLowerCase() ||
            s.id.toLowerCase() === cleanTarget.toLowerCase()
        ) ||
        steps.find((s) => cleanTarget.includes(s.name) || s.name.includes(cleanTarget));

      if (matched) {
        currentStepId = matched.id;
      }
    }

    if (currentStepId && result[currentStepId]) {
      result[currentStepId].push(rawLine);
    }
  }

  for (const step of steps) {
    if (result[step.id].length === 0 && steps.length === 1 && allLines.length > 0) {
      result[step.id] = [...allLines];
    }
  }

  return result;
}
