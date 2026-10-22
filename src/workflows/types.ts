export interface WorkflowInput {
  name: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  type?: string;
  options?: string[];
}

export interface WorkflowJob {
  id: string;
  name: string;
  needs: string[];
  runsOn?: string | string[];
  hasMatrix: boolean;
}

export interface ParsedWorkflow {
  filePath: string;
  fileName: string;
  workspaceFolderUri: string;
  isValid: boolean;
  error?: string;
  name: string;
  events: string[];
  inputs: WorkflowInput[];
  jobs: WorkflowJob[];
}
