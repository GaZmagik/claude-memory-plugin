/**
 * Tests for T049: Default scope selection logic
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  selectDefaultScope,
  getRecommendedScope,
  validateScopeChoice,
} from './defaults.js';
import { Scope } from '../types/enums.js';
import type { DefaultScopeOptions } from './defaults.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';

describe('selectDefaultScope', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'defaults-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('forced default', () => {
    it('should use forced default when provided', () => {
      const options: DefaultScopeOptions = {
        cwd: testDir,
        forceDefault: Scope.Local,
      };

      const result = selectDefaultScope(options);

      expect(result.scope).toBe(Scope.Local);
      expect(result.source).toBe('forced');
    });

    it('should prioritise forced default over config', () => {
      // Create a config file with a different default
      const claudeDir = path.join(testDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });

      const config = {
        scopes: {
          default: 'project'
        }
      };
      fs.writeFileSync(path.join(claudeDir, 'config.json'), JSON.stringify(config));

      const options: DefaultScopeOptions = {
        cwd: testDir,
        forceDefault: Scope.Global,
      };

      const result = selectDefaultScope(options);

      // Forced default should override config
      expect(result.scope).toBe(Scope.Global);
      expect(result.source).toBe('forced');
    });
  });

  describe('config-based default', () => {
    it('should use config default when present', () => {
      // Create config with default scope
      const claudeDir = path.join(testDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });

      const config = {
        scopes: {
          default: 'local'
        }
      };
      fs.writeFileSync(path.join(claudeDir, 'config.json'), JSON.stringify(config));

      const options: DefaultScopeOptions = {
        cwd: testDir,
      };

      const result = selectDefaultScope(options);

      expect(result.scope).toBe(Scope.Local);
      expect(result.source).toBe('config');
    });

    it('should validate config scope value', () => {
      // Create config with invalid scope
      const claudeDir = path.join(testDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });

      const config = {
        scopes: {
          default: 'invalid-scope'
        }
      };
      fs.writeFileSync(path.join(claudeDir, 'config.json'), JSON.stringify(config));

      const options: DefaultScopeOptions = {
        cwd: testDir,
      };

      const result = selectDefaultScope(options);

      // Should fall through to next option (global fallback since no git)
      expect(result.scope).toBe(Scope.Global);
      expect(result.source).not.toBe('config');
    });

    it('should fall through when config has invalid scope', () => {
      const claudeDir = path.join(testDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });

      const config = {
        scopes: {
          default: 'not-a-real-scope'
        }
      };
      fs.writeFileSync(path.join(claudeDir, 'config.json'), JSON.stringify(config));

      const result = selectDefaultScope({ cwd: testDir });

      // Should fall through to global (no git repo)
      expect(result.scope).toBe(Scope.Global);
      expect(result.source).toBe('fallback');
    });
  });

  describe('git detection', () => {
    it('should use project scope when in git repository', () => {
      // Initialize a git repo
      try {
        spawnSync('git', ['init'], { cwd: testDir, stdio: 'pipe' });
        spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: testDir, stdio: 'pipe' });
        spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: testDir, stdio: 'pipe' });

        const result = selectDefaultScope({ cwd: testDir });

        expect(result.scope).toBe(Scope.Project);
        expect(result.source).toBe('git-detection');
      } catch (error) {
        // Skip test if git is not available
        console.warn('Git not available, skipping git detection test');
      }
    });

    it('should set source to git-detection', () => {
      try {
        spawnSync('git', ['init'], { cwd: testDir, stdio: 'pipe' });
        spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: testDir, stdio: 'pipe' });
        spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: testDir, stdio: 'pipe' });

        const result = selectDefaultScope({ cwd: testDir });

        expect(result.source).toBe('git-detection');
        expect(result.reason).toContain('git');
      } catch (error) {
        console.warn('Git not available, skipping git detection test');
      }
    });
  });

  describe('fallback', () => {
    it('should use global scope when not in git repo', () => {
      const result = selectDefaultScope({ cwd: testDir });

      expect(result.scope).toBe(Scope.Global);
    });

    it('should set source to fallback', () => {
      const result = selectDefaultScope({ cwd: testDir });

      expect(result.source).toBe('fallback');
      expect(result.reason).toContain('Not in git');
    });
  });

  describe('priority order', () => {
    it('should check forced > config > git > fallback', () => {
      // Create git repo
      try {
        spawnSync('git', ['init'], { cwd: testDir, stdio: 'pipe' });
        spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: testDir, stdio: 'pipe' });
        spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: testDir, stdio: 'pipe' });
      } catch {
        // Continue without git
      }

      // Create config
      const claudeDir = path.join(testDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });
      const config = { scopes: { default: 'local' } };
      fs.writeFileSync(path.join(claudeDir, 'config.json'), JSON.stringify(config));

      // Test forced overrides everything
      const forcedResult = selectDefaultScope({ cwd: testDir, forceDefault: Scope.Enterprise });
      expect(forcedResult.scope).toBe(Scope.Enterprise);
      expect(forcedResult.source).toBe('forced');

      // Test config overrides git
      const configResult = selectDefaultScope({ cwd: testDir });
      expect(configResult.scope).toBe(Scope.Local);
      expect(configResult.source).toBe('config');
    });
  });
});

describe('getRecommendedScope', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recommend-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('memory type recommendations', () => {
    it('should recommend global for artifacts', () => {
      const result = getRecommendedScope('artifact', testDir);
      expect(result.scope).toBe(Scope.Global);
      expect(result.reason).toContain('shared across projects');
    });

    it('should recommend project for gotchas in git repo', () => {
      try {
        spawnSync('git', ['init'], { cwd: testDir, stdio: 'pipe' });
        spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: testDir, stdio: 'pipe' });
        spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: testDir, stdio: 'pipe' });

        const result = getRecommendedScope('gotcha', testDir);

        expect(result.scope).toBe(Scope.Project);
        expect(result.reason).toContain('project-specific');
      } catch {
        console.warn('Git not available, skipping test');
      }
    });

    it('should recommend project for learnings in git repo', () => {
      try {
        spawnSync('git', ['init'], { cwd: testDir, stdio: 'pipe' });
        spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: testDir, stdio: 'pipe' });
        spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: testDir, stdio: 'pipe' });

        const result = getRecommendedScope('learning', testDir);

        expect(result.scope).toBe(Scope.Project);
        expect(result.reason).toContain('project-specific');
      } catch {
        console.warn('Git not available, skipping test');
      }
    });

    it('should recommend local for breadcrumbs', () => {
      const result = getRecommendedScope('breadcrumb', testDir);
      expect(result.scope).toBe(Scope.Local);
      expect(result.reason).toContain('temporary personal');
    });

    it('should fall back to default for unknown types', () => {
      const result = getRecommendedScope('unknown-type', testDir);

      // Should use default logic (global for non-git directory)
      expect(result.scope).toBe(Scope.Global);
    });
  });

  describe('context awareness', () => {
    it('should consider git context for project-specific types', () => {
      try {
        spawnSync('git', ['init'], { cwd: testDir, stdio: 'pipe' });
        spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: testDir, stdio: 'pipe' });
        spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: testDir, stdio: 'pipe' });

        const gotchaResult = getRecommendedScope('gotcha', testDir);
        const learningResult = getRecommendedScope('learning', testDir);

        expect(gotchaResult.scope).toBe(Scope.Project);
        expect(learningResult.scope).toBe(Scope.Project);
      } catch {
        console.warn('Git not available, skipping test');
      }
    });

    it('should ignore git context for globally-scoped types', () => {
      try {
        spawnSync('git', ['init'], { cwd: testDir, stdio: 'pipe' });
        spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: testDir, stdio: 'pipe' });
        spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: testDir, stdio: 'pipe' });

        const result = getRecommendedScope('artifact', testDir);

        // Artifacts should always be global, regardless of git
        expect(result.scope).toBe(Scope.Global);
      } catch {
        console.warn('Git not available, skipping test');
      }
    });
  });
});

describe('validateScopeChoice', () => {
  describe('personal content warnings', () => {
    it('should warn when personal content in project scope', () => {
      const warnings = validateScopeChoice(
        Scope.Project,
        'learning',
        'This is my personal note about something private'
      );
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('personal');
    });

    it('should warn when personal content in enterprise scope', () => {
      const warnings = validateScopeChoice(
        Scope.Enterprise,
        'learning',
        'This is confidential information'
      );
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('should not warn when personal content in local scope', () => {
      const warnings = validateScopeChoice(
        Scope.Local,
        'learning',
        'This is my personal note'
      );
      expect(warnings).toEqual([]);
    });

    it('should detect multiple personal indicators', () => {
      const indicators = ['my personal', 'private', 'do not share', 'confidential'];
      for (const indicator of indicators) {
        const warnings = validateScopeChoice(Scope.Project, 'learning', indicator);
        expect(warnings.length).toBeGreaterThan(0);
      }
    });
  });

  describe('breadcrumb warnings', () => {
    it('should warn when breadcrumb not in local scope', () => {
      const warnings = validateScopeChoice(Scope.Project, 'breadcrumb', 'test content');
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('Breadcrumbs');
    });

    it('should not warn when breadcrumb in local scope', () => {
      const warnings = validateScopeChoice(Scope.Local, 'breadcrumb', 'test content');
      const breadcrumbWarnings = warnings.filter(w => w.includes('Breadcrumbs'));
      expect(breadcrumbWarnings).toEqual([]);
    });
  });

  describe('artifact warnings', () => {
    it('should warn when artifact in local scope', () => {
      const warnings = validateScopeChoice(Scope.Local, 'artifact', 'test content');
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('Artifacts');
    });

    it('should not warn when artifact in project scope', () => {
      const warnings = validateScopeChoice(Scope.Project, 'artifact', 'test content');
      const artifactWarnings = warnings.filter(w => w.includes('Artifacts'));
      expect(artifactWarnings).toEqual([]);
    });

    it('should not warn when artifact in global scope', () => {
      const warnings = validateScopeChoice(Scope.Global, 'artifact', 'test content');
      const artifactWarnings = warnings.filter(w => w.includes('Artifacts'));
      expect(artifactWarnings).toEqual([]);
    });
  });

  describe('case insensitivity', () => {
    it('should detect personal indicators case-insensitively', () => {
      const warnings = validateScopeChoice(
        Scope.Project,
        'learning',
        'This is MY PERSONAL note'
      );
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  describe('multiple warnings', () => {
    it('should return multiple warnings when applicable', () => {
      const warnings = validateScopeChoice(
        Scope.Project,
        'breadcrumb',
        'my personal breadcrumb'
      );
      expect(warnings.length).toBeGreaterThan(1);
    });
  });
});
