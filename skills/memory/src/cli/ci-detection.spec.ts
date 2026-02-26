import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isCI } from './ci-detection.js';

describe('isCI', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CI;
    delete process.env.CONTINUOUS_INTEGRATION;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.JENKINS_URL;
    delete process.env.CIRCLECI;
    delete process.env.TRAVIS;
    delete process.env.GITLAB_CI;
    delete process.env.BUILDKITE;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return false when no CI env vars are set', () => {
    expect(isCI()).toBe(false);
  });

  it('should return true when CI is set', () => {
    process.env.CI = 'true';
    expect(isCI()).toBe(true);
  });

  it('should return true when GITHUB_ACTIONS is set', () => {
    process.env.GITHUB_ACTIONS = 'true';
    expect(isCI()).toBe(true);
  });

  it('should return true when JENKINS_URL is set', () => {
    process.env.JENKINS_URL = 'http://jenkins.local';
    expect(isCI()).toBe(true);
  });

  it('should return true when GITLAB_CI is set', () => {
    process.env.GITLAB_CI = 'true';
    expect(isCI()).toBe(true);
  });
});
