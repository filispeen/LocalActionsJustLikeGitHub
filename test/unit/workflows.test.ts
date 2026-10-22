import { describe, expect, it } from 'vitest';
import { parseWorkflowYaml } from '../../src/workflows/parser';

describe('Workflow YAML Parser', () => {
  it('parses workflow with string on', () => {
    const yaml = `
name: Build
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo hello
`;
    const parsed = parseWorkflowYaml(yaml, '/repo/.github/workflows/build.yml', 'file:///repo');
    expect(parsed.isValid).toBe(true);
    expect(parsed.name).toBe('Build');
    expect(parsed.events).toEqual(['push']);
    expect(parsed.jobs.length).toBe(1);
    expect(parsed.jobs[0].id).toBe('build');
    expect(parsed.jobs[0].name).toBe('build');
    expect(parsed.jobs[0].runsOn).toBe('ubuntu-latest');
    expect(parsed.jobs[0].hasMatrix).toBe(false);
  });

  it('parses workflow with array on', () => {
    const yaml = `
name: CI
on: [push, pull_request]
jobs:
  test:
    name: Run Tests
    runs-on: [self-hosted, linux]
    steps:
      - run: npm test
`;
    const parsed = parseWorkflowYaml(yaml, '/repo/.github/workflows/ci.yaml', 'file:///repo');
    expect(parsed.isValid).toBe(true);
    expect(parsed.name).toBe('CI');
    expect(parsed.events).toEqual(['push', 'pull_request']);
    expect(parsed.jobs[0].name).toBe('Run Tests');
    expect(parsed.jobs[0].runsOn).toEqual(['self-hosted', 'linux']);
  });

  it('parses workflow with workflow_dispatch inputs and job dependencies', () => {
    const yaml = `
name: Deploy
on:
  workflow_dispatch:
    inputs:
      environment:
        description: Target environment
        required: true
        default: production
        type: choice
        options:
          - staging
          - production
      debug_mode:
        description: Enable debug logs
        required: false
        type: boolean
        default: false
jobs:
  build:
    runs-on: ubuntu-latest
  deploy:
    name: Deploy App
    needs: build
    runs-on: ubuntu-latest
  notify:
    needs: [build, deploy]
    runs-on: ubuntu-latest
`;
    const parsed = parseWorkflowYaml(yaml, '/repo/.github/workflows/deploy.yml', 'file:///repo');
    expect(parsed.isValid).toBe(true);
    expect(parsed.name).toBe('Deploy');
    expect(parsed.events).toContain('workflow_dispatch');
    expect(parsed.inputs.length).toBe(2);

    const envInput = parsed.inputs.find((i) => i.name === 'environment');
    expect(envInput).toBeDefined();
    expect(envInput?.description).toBe('Target environment');
    expect(envInput?.required).toBe(true);
    expect(envInput?.default).toBe('production');
    expect(envInput?.type).toBe('choice');
    expect(envInput?.options).toEqual(['staging', 'production']);

    const debugInput = parsed.inputs.find((i) => i.name === 'debug_mode');
    expect(debugInput?.type).toBe('boolean');
    expect(debugInput?.required).toBe(false);

    expect(parsed.jobs.length).toBe(3);
    const deployJob = parsed.jobs.find((j) => j.id === 'deploy');
    expect(deployJob?.needs).toEqual(['build']);

    const notifyJob = parsed.jobs.find((j) => j.id === 'notify');
    expect(notifyJob?.needs).toEqual(['build', 'deploy']);
  });

  it('detects strategy matrix', () => {
    const yaml = `
name: Matrix
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [18, 20]
`;
    const parsed = parseWorkflowYaml(yaml, '/repo/.github/workflows/matrix.yml', 'file:///repo');
    expect(parsed.isValid).toBe(true);
    expect(parsed.jobs[0].hasMatrix).toBe(true);
  });

  it('falls back to file name when name is omitted', () => {
    const yaml = `
on: push
jobs:
  job1:
    runs-on: ubuntu-latest
`;
    const parsed = parseWorkflowYaml(yaml, '/repo/.github/workflows/unnamed.yml', 'file:///repo');
    expect(parsed.isValid).toBe(true);
    expect(parsed.name).toBe('unnamed.yml');
  });

  it('handles invalid YAML syntax gracefully', () => {
    const yaml = `
name: Broken
on: [push
jobs:
  invalid: : :
`;
    const parsed = parseWorkflowYaml(yaml, '/repo/.github/workflows/broken.yml', 'file:///repo');
    expect(parsed.isValid).toBe(false);
    expect(parsed.error).toBeDefined();
    expect(parsed.name).toBe('broken.yml');
    expect(parsed.jobs).toEqual([]);
  });

  it('handles empty or non-object content', () => {
    const parsed = parseWorkflowYaml('', '/repo/.github/workflows/empty.yml', 'file:///repo');
    expect(parsed.isValid).toBe(false);
    expect(parsed.error).toBe('Empty or invalid workflow document');
  });
});
