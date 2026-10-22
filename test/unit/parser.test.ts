import { describe, expect, it } from 'vitest';
import { parseActJsonLine, parseActTextLine, redactSecrets } from '../../src/act/parser';

describe('redactSecrets', () => {
  it('redacts secrets from string', () => {
    const text = 'Authorization: Bearer supersecrettoken123 and key=anothersecret';
    const redacted = redactSecrets(text, ['supersecrettoken123', 'anothersecret']);
    expect(redacted).toBe('Authorization: Bearer *** and key=***');
  });

  it('ignores short secrets less than 3 characters', () => {
    const text = 'foo bar';
    const redacted = redactSecrets(text, ['a', 'b']);
    expect(redacted).toBe('foo bar');
  });

  it('handles empty input gracefully', () => {
    expect(redactSecrets('', ['secret'])).toBe('');
    expect(redactSecrets('test', [])).toBe('test');
  });
});

describe('parseActJsonLine', () => {
  it('parses step start line', () => {
    const line = '{"dryrun":false,"job":"Test Host/Build Job","jobID":"build","level":"info","matrix":{},"msg":"⭐ Run Main Step One","stage":"Main","step":"Step One","stepID":["0"],"time":"2026-10-22T20:14:10+03:00"}';
    const event = parseActJsonLine(line);
    expect(event).toBeDefined();
    expect(event?.type).toBe('step_start');
    expect(event?.jobId).toBe('build');
    expect(event?.jobName).toBe('Build Job');
    expect(event?.stepName).toBe('Step One');
    expect(event?.stepId).toBe('0');
    expect(event?.status).toBe('in_progress');
  });

  it('parses raw log output line', () => {
    const line = '{"dryrun":false,"job":"Test Host/Build Job","jobID":"build","level":"info","matrix":{},"msg":"Hello world\\r\\n","raw_output":true,"stage":"Main","step":"Step One","stepID":["0"],"time":"2026-10-22T20:14:12+03:00"}';
    const event = parseActJsonLine(line);
    expect(event).toBeDefined();
    expect(event?.type).toBe('log_line');
    expect(event?.message).toBe('Hello world\r\n');
    expect(event?.rawOutput).toBe(true);
  });

  it('parses step success line with execution time', () => {
    const line = '{"dryrun":false,"executionTime":1672690700,"job":"Test Host/Build Job","jobID":"build","level":"info","matrix":{},"msg":"  ✅  Success - Main Step One [1.6726907s]","stage":"Main","step":"Step One","stepID":["0"],"stepResult":"success","time":"2026-10-22T20:14:12+03:00"}';
    const event = parseActJsonLine(line);
    expect(event).toBeDefined();
    expect(event?.type).toBe('step_finish');
    expect(event?.status).toBe('success');
    expect(event?.durationMs).toBe(1673);
  });

  it('parses step failure line', () => {
    const line = '{"dryrun":false,"executionTime":1063318900,"job":"Test Failing/Failing Job","jobID":"failing_job","level":"info","matrix":{},"msg":"  ❌  Failure - Main Failing Step [1.0633189s]","stage":"Main","step":"Failing Step","stepID":["1"],"stepResult":"failure","time":"2026-10-22T20:14:27+03:00"}';
    const event = parseActJsonLine(line);
    expect(event).toBeDefined();
    expect(event?.type).toBe('step_finish');
    expect(event?.status).toBe('failure');
    expect(event?.durationMs).toBe(1063);
  });

  it('parses job finish line', () => {
    const line = '{"dryrun":false,"job":"Test Host/Build Job","jobID":"build","jobResult":"success","level":"info","matrix":{},"msg":"🏁  Job succeeded","time":"2026-10-22T20:14:13+03:00"}';
    const event = parseActJsonLine(line);
    expect(event).toBeDefined();
    expect(event?.type).toBe('job_finish');
    expect(event?.status).toBe('success');
    expect(event?.jobId).toBe('build');
  });

  it('parses notice / warning line', () => {
    const line = '{"level":"warning","msg":"Couldn\'t get a valid docker connection","time":"2026-10-22T20:14:10+03:00"}';
    const event = parseActJsonLine(line);
    expect(event).toBeDefined();
    expect(event?.type).toBe('notice');
    expect(event?.message).toBe("Couldn't get a valid docker connection");
  });

  it('returns undefined for non-json lines', () => {
    expect(parseActJsonLine('plain text')).toBeUndefined();
  });
});

describe('parseActTextLine', () => {
  it('parses text step start', () => {
    const line = '[Test Host/Build Job] ⭐ Run Main Step One';
    const event = parseActTextLine(line);
    expect(event.type).toBe('step_start');
    expect(event.jobName).toBe('Build Job');
    expect(event.stepName).toBe('Step One');
  });

  it('parses text log line with pipe prefix', () => {
    const line = '[Test Host/Build Job]   | Hello world';
    const event = parseActTextLine(line);
    expect(event.type).toBe('log_line');
    expect(event.message).toBe('Hello world');
  });

  it('parses text step success', () => {
    const line = '[Test Host/Build Job]   ✅  Success - Main Step One [1.3718603s]';
    const event = parseActTextLine(line);
    expect(event.type).toBe('step_finish');
    expect(event.status).toBe('success');
    expect(event.durationMs).toBe(1372);
  });

  it('parses text job success', () => {
    const line = '[Test Host/Build Job] 🏁  Job succeeded';
    const event = parseActTextLine(line);
    expect(event.type).toBe('job_finish');
    expect(event.status).toBe('success');
  });
});
