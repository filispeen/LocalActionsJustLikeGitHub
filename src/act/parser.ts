import { RunStatus } from '../runs/types';

export interface ParsedActEvent {
  type: 'job_start' | 'job_finish' | 'step_start' | 'step_finish' | 'log_line' | 'notice';
  jobId?: string;
  jobName?: string;
  stepId?: string;
  stepName?: string;
  status?: RunStatus;
  message?: string;
  durationMs?: number;
  rawOutput?: boolean;
  timestamp?: string;
}

export function redactSecrets(text: string, secrets: string[]): string {
  if (!secrets || secrets.length === 0 || !text) {
    return text;
  }

  const sortedSecrets = [...secrets]
    .filter((s) => typeof s === 'string' && s.trim().length >= 3)
    .sort((a, b) => b.length - a.length);

  let result = text;
  for (const secret of sortedSecrets) {
    result = result.split(secret).join('***');
  }
  return result;
}

export function parseActJsonLine(line: string): ParsedActEvent | undefined {
  const trimmed = line.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return undefined;
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return undefined;
  }

  const msg = typeof data.msg === 'string' ? data.msg : '';
  const timestamp = typeof data.time === 'string' ? data.time : new Date().toISOString();
  const rawOutput = Boolean(data.raw_output);
  const jobId = typeof data.jobID === 'string' ? data.jobID : undefined;

  let jobName: string | undefined;
  if (typeof data.job === 'string') {
    const parts = data.job.split('/');
    jobName = parts.length > 1 ? parts.slice(1).join('/') : data.job;
  }

  const stepName = typeof data.step === 'string' ? data.step : undefined;
  let stepId: string | undefined;
  if (Array.isArray(data.stepID) && data.stepID.length > 0) {
    stepId = String(data.stepID[0]);
  } else if (Array.isArray(data.stepid) && data.stepid.length > 0) {
    stepId = String(data.stepid[0]);
  } else if (stepName) {
    stepId = stepName;
  }

  const executionTimeNs = typeof data.executionTime === 'number' ? data.executionTime : undefined;
  const durationMs = executionTimeNs !== undefined ? Math.round(executionTimeNs / 1_000_000) : undefined;

  if (typeof data.jobResult === 'string') {
    const status: RunStatus = data.jobResult === 'success' ? 'success' : 'failure';
    return {
      type: 'job_finish',
      jobId,
      jobName,
      status,
      message: msg,
      timestamp
    };
  }

  if (typeof data.stepResult === 'string') {
    const status: RunStatus = data.stepResult === 'success' ? 'success' : 'failure';
    return {
      type: 'step_finish',
      jobId,
      jobName,
      stepId,
      stepName,
      status,
      durationMs,
      message: msg,
      timestamp
    };
  }

  if (msg.includes('⭐ Run ')) {
    return {
      type: 'step_start',
      jobId,
      jobName,
      stepId,
      stepName,
      status: 'in_progress',
      message: msg,
      timestamp
    };
  }

  if (rawOutput || (jobId && stepName)) {
    return {
      type: 'log_line',
      jobId,
      jobName,
      stepId,
      stepName,
      message: msg,
      rawOutput,
      timestamp
    };
  }

  return {
    type: 'notice',
    jobId,
    jobName,
    message: msg,
    timestamp
  };
}

export function parseActTextLine(line: string): ParsedActEvent {
  const timestamp = new Date().toISOString();
  const match = line.match(/^\[([^/\]]+(?:\/[^\]]+)?)\]\s*(.*)$/);

  if (!match) {
    return {
      type: 'notice',
      message: line,
      timestamp
    };
  }

  const jobTarget = match[1];
  const content = match[2];

  const slashIdx = jobTarget.indexOf('/');
  const jobName = slashIdx !== -1 ? jobTarget.substring(slashIdx + 1) : jobTarget;
  const jobId = jobName;

  if (content.startsWith('⭐ Run ')) {
    const rawStep = content.replace('⭐ Run ', '').trim();
    const cleanStep = rawStep.startsWith('Main ') ? rawStep.replace('Main ', '') : rawStep;
    return {
      type: 'step_start',
      jobId,
      jobName,
      stepId: cleanStep,
      stepName: cleanStep,
      status: 'in_progress',
      message: content,
      timestamp
    };
  }

  if (content.includes('✅  Success - ')) {
    const parts = content.split('✅  Success - ')[1];
    const durationMatch = parts.match(/\[([0-9.]+)(s|ms)\]/);
    let durationMs: number | undefined;
    if (durationMatch) {
      const val = parseFloat(durationMatch[1]);
      durationMs = durationMatch[2] === 's' ? Math.round(val * 1000) : Math.round(val);
    }
    const stepName = parts.replace(/\s*\[.*\]$/, '').trim().replace(/^Main\s+/, '');
    return {
      type: 'step_finish',
      jobId,
      jobName,
      stepId: stepName,
      stepName,
      status: 'success',
      durationMs,
      message: content,
      timestamp
    };
  }

  if (content.includes('❌  Failure - ')) {
    const parts = content.split('❌  Failure - ')[1];
    const durationMatch = parts.match(/\[([0-9.]+)(s|ms)\]/);
    let durationMs: number | undefined;
    if (durationMatch) {
      const val = parseFloat(durationMatch[1]);
      durationMs = durationMatch[2] === 's' ? Math.round(val * 1000) : Math.round(val);
    }
    const stepName = parts.replace(/\s*\[.*\]$/, '').trim().replace(/^Main\s+/, '');
    return {
      type: 'step_finish',
      jobId,
      jobName,
      stepId: stepName,
      stepName,
      status: 'failure',
      durationMs,
      message: content,
      timestamp
    };
  }

  if (content.includes('🏁  Job succeeded')) {
    return {
      type: 'job_finish',
      jobId,
      jobName,
      status: 'success',
      message: content,
      timestamp
    };
  }

  if (content.includes('🏁  Job failed')) {
    return {
      type: 'job_finish',
      jobId,
      jobName,
      status: 'failure',
      message: content,
      timestamp
    };
  }

  const logMessage = content.startsWith('| ') ? content.substring(2) : content;
  return {
    type: 'log_line',
    jobId,
    jobName,
    message: logMessage,
    rawOutput: true,
    timestamp
  };
}
