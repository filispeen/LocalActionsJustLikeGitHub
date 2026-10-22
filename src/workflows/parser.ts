import * as path from 'node:path';
import * as yaml from 'yaml';
import { ParsedWorkflow, WorkflowInput, WorkflowJob } from './types';

export function parseWorkflowYaml(content: string, filePath: string, workspaceFolderUri: string): ParsedWorkflow {
  const fileName = path.basename(filePath);

  let doc: unknown;
  try {
    doc = yaml.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      filePath,
      fileName,
      workspaceFolderUri,
      isValid: false,
      error: message,
      name: fileName,
      events: [],
      inputs: [],
      jobs: []
    };
  }

  if (typeof doc !== 'object' || doc === null) {
    return {
      filePath,
      fileName,
      workspaceFolderUri,
      isValid: false,
      error: 'Empty or invalid workflow document',
      name: fileName,
      events: [],
      inputs: [],
      jobs: []
    };
  }

  const rawDoc = doc as Record<string, unknown>;
  const name = typeof rawDoc.name === 'string' && rawDoc.name.trim().length > 0
    ? rawDoc.name.trim()
    : fileName;

  const events: string[] = [];
  const inputs: WorkflowInput[] = [];

  const rawOn = rawDoc.on;
  if (typeof rawOn === 'string') {
    events.push(rawOn);
  } else if (Array.isArray(rawOn)) {
    for (const item of rawOn) {
      if (typeof item === 'string') {
        events.push(item);
      }
    }
  } else if (typeof rawOn === 'object' && rawOn !== null) {
    const onMap = rawOn as Record<string, unknown>;
    for (const key of Object.keys(onMap)) {
      events.push(key);
    }

    const dispatch = onMap.workflow_dispatch;
    if (typeof dispatch === 'object' && dispatch !== null) {
      const rawInputs = (dispatch as Record<string, unknown>).inputs;
      if (typeof rawInputs === 'object' && rawInputs !== null) {
        for (const [inputKey, val] of Object.entries(rawInputs as Record<string, unknown>)) {
          if (typeof val === 'object' && val !== null) {
            const inputObj = val as Record<string, unknown>;
            inputs.push({
              name: inputKey,
              description: typeof inputObj.description === 'string' ? inputObj.description : undefined,
              required: Boolean(inputObj.required),
              default: inputObj.default,
              type: typeof inputObj.type === 'string' ? inputObj.type : undefined,
              options: Array.isArray(inputObj.options)
                ? inputObj.options.filter((opt): opt is string => typeof opt === 'string')
                : undefined
            });
          }
        }
      }
    }
  }

  const jobs: WorkflowJob[] = [];
  const rawJobs = rawDoc.jobs;
  if (typeof rawJobs === 'object' && rawJobs !== null) {
    for (const [jobId, val] of Object.entries(rawJobs as Record<string, unknown>)) {
      if (typeof val === 'object' && val !== null) {
        const jobObj = val as Record<string, unknown>;
        const jobName = typeof jobObj.name === 'string' && jobObj.name.trim().length > 0
          ? jobObj.name.trim()
          : jobId;

        const needs: string[] = [];
        if (typeof jobObj.needs === 'string') {
          needs.push(jobObj.needs);
        } else if (Array.isArray(jobObj.needs)) {
          for (const item of jobObj.needs) {
            if (typeof item === 'string') {
              needs.push(item);
            }
          }
        }

        let runsOn: string | string[] | undefined;
        if (typeof jobObj['runs-on'] === 'string') {
          runsOn = jobObj['runs-on'];
        } else if (Array.isArray(jobObj['runs-on'])) {
          runsOn = jobObj['runs-on'].filter((item): item is string => typeof item === 'string');
        }

        let hasMatrix = false;
        if (typeof jobObj.strategy === 'object' && jobObj.strategy !== null) {
          const strategy = jobObj.strategy as Record<string, unknown>;
          if (typeof strategy.matrix === 'object' && strategy.matrix !== null) {
            hasMatrix = true;
          }
        }

        jobs.push({
          id: jobId,
          name: jobName,
          needs,
          runsOn,
          hasMatrix
        });
      }
    }
  }

  return {
    filePath,
    fileName,
    workspaceFolderUri,
    isValid: true,
    name,
    events,
    inputs,
    jobs
  };
}
