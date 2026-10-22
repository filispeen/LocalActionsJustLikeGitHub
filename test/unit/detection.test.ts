import { describe, expect, it } from 'vitest';
import { parseActVersion, parseDockerVersion, detectAct, detectDocker } from '../../src/act/detection';

describe('detection', () => {
  describe('parseActVersion', () => {
    it('parses standard act version string', () => {
      const output = 'act version 0.2.71';
      expect(parseActVersion(output)).toBe('0.2.71');
    });

    it('parses act version string with git hash or suffix', () => {
      const output = 'act version 0.2.75-dirty';
      expect(parseActVersion(output)).toBe('0.2.75-dirty');
    });

    it('parses bare semver output as fallback', () => {
      const output = '0.2.70';
      expect(parseActVersion(output)).toBe('0.2.70');
    });

    it('returns undefined for non-version output', () => {
      const output = 'command not recognized';
      expect(parseActVersion(output)).toBeUndefined();
    });
  });

  describe('parseDockerVersion', () => {
    it('parses standard docker version output', () => {
      const output = 'Docker version 24.0.7, build afdd53b';
      expect(parseDockerVersion(output)).toBe('24.0.7');
    });

    it('parses docker version with date or release tag', () => {
      const output = 'Docker version 27.3.1-desktop.1';
      expect(parseDockerVersion(output)).toBe('27.3.1-desktop.1');
    });

    it('returns undefined for non-version output', () => {
      const output = 'error';
      expect(parseDockerVersion(output)).toBeUndefined();
    });
  });

  describe('detectAct', () => {
    it('returns installed false for non-existent path', async () => {
      const status = await detectAct('non-existent-binary-xyz');
      expect(status.installed).toBe(false);
      expect(status.path).toBe('non-existent-binary-xyz');
      expect(status.error).toBeDefined();
    });
  });

  describe('detectDocker', () => {
    it('returns installed false for non-existent docker path', async () => {
      const status = await detectDocker('non-existent-docker-binary');
      expect(status.installed).toBe(false);
      expect(status.running).toBe(false);
      expect(status.error).toBeDefined();
    });
  });
});
