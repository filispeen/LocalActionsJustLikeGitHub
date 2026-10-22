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

  let currentStepId: string | undefined;

  for (const rawLine of allLines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const runMatch = line.match(/⭐\s*Run\s+(.+)$/);
    if (runMatch) {
      const stepTarget = runMatch[1].trim();
      const matched = steps.find(
        (s) =>
          s.name === stepTarget ||
          s.id === stepTarget ||
          stepTarget.includes(s.name) ||
          s.name.includes(stepTarget)
      );
      if (matched) {
        currentStepId = matched.id;
      }
    }

    if (currentStepId && result[currentStepId]) {
      result[currentStepId].push(rawLine);
    }

    if (line.includes('✅  Success - ') || line.includes('❌  Failure - ')) {
      currentStepId = undefined;
    }
  }

  for (const step of steps) {
    if (result[step.id].length === 0 && steps.length === 1 && allLines.length > 0) {
      result[step.id] = [...allLines];
    }
  }

  return result;
}
