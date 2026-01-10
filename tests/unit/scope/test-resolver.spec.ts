/**
 * T035: Unit test for scope detection logic
 *
 * Tests the scope resolver that determines memory storage locations
 * based on the 4-tier hierarchy: enterprise → local → project → global
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import {
  resolveScope,
  getScopePath,
  getDefaultScope,
  isEnterpriseEnabled,
  getAllAccessibleScopes,
  type ScopeContext,
} from '../../../skills/memory/src/scope/resolver.js';
import { Scope } from '../../../skills/memory/src/types/enums.js';

describe('Scope Resolver', () => {
  let testDir: string;
  let globalMemoryDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'scope-resolver-'));
    globalMemoryDir = fs.mkdtempSync(path.join(tmpdir(), 'global-memory-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    fs.rmSync(globalMemoryDir, { recursive: true, force: true });
  });

  describe('resolveScope', () => {
    it('should resolve explicit global scope', () => {
      const result = resolveScope({
        requestedScope: Scope.Global,
        cwd: testDir,
        globalMemoryPath: globalMemoryDir,
      });

      expect(result.scope).toBe(Scope.Global);
      expect(result.path).toBe(globalMemoryDir);
    });

    it('should resolve explicit project scope', () => {
      const result = resolveScope({
        requestedScope: Scope.Project,
        cwd: testDir,
        globalMemoryPath: globalMemoryDir,
      });

      expect(result.scope).toBe(Scope.Project);
      expect(result.path).toBe(path.join(testDir, '.claude', 'memory'));
    });

    it('should resolve explicit local scope', () => {
      const result = resolveScope({
        requestedScope: Scope.Local,
        cwd: testDir,
        globalMemoryPath: globalMemoryDir,
      });

      expect(result.scope).toBe(Scope.Local);
      expect(result.path).toBe(path.join(testDir, '.claude', 'memory', 'local'));
    });

    it('should reject enterprise scope when disabled', () => {
      const result = resolveScope({
        requestedScope: Scope.Enterprise,
        cwd: testDir,
        globalMemoryPath: globalMemoryDir,
        enterpriseEnabled: false,
      });

      expect(result.scope).toBeNull();
      expect(result.error).toContain('enterprise');
      expect(result.error).toContain('disabled');
    });

    it('should resolve enterprise scope when enabled with path', () => {
      const enterprisePath = fs.mkdtempSync(path.join(tmpdir(), 'enterprise-'));

      const result = resolveScope({
        requestedScope: Scope.Enterprise,
        cwd: testDir,
        globalMemoryPath: globalMemoryDir,
        enterpriseEnabled: true,
        enterprisePath,
      });

      expect(result.scope).toBe(Scope.Enterprise);
      expect(result.path).toBe(enterprisePath);

      fs.rmSync(enterprisePath, { recursive: true, force: true });
    });

    it('should reject enterprise scope when enabled but no path configured', () => {
      const result = resolveScope({
        requestedScope: Scope.Enterprise,
        cwd: testDir,
        globalMemoryPath: globalMemoryDir,
        enterpriseEnabled: true,
        enterprisePath: undefined,
      });

      expect(result.scope).toBeNull();
      expect(result.error).toContain('path');
    });
  });

  describe('getScopePath', () => {
    it('should return global memory path for global scope', () => {
      const result = getScopePath(Scope.Global, testDir, globalMemoryDir);
      expect(result).toBe(globalMemoryDir);
    });

    it('should return .claude/memory for project scope', () => {
      const result = getScopePath(Scope.Project, testDir, globalMemoryDir);
      expect(result).toBe(path.join(testDir, '.claude', 'memory'));
    });

    it('should return .claude/memory/local for local scope', () => {
      const result = getScopePath(Scope.Local, testDir, globalMemoryDir);
      expect(result).toBe(path.join(testDir, '.claude', 'memory', 'local'));
    });
  });

  describe('getDefaultScope', () => {
    it('should return project scope when in git repository', () => {
      // Create .git directory to simulate git repo
      fs.mkdirSync(path.join(testDir, '.git'));

      const result = getDefaultScope(testDir);
      expect(result).toBe(Scope.Project);
    });

    it('should return global scope when not in git repository', () => {
      // No .git directory
      const result = getDefaultScope(testDir);
      expect(result).toBe(Scope.Global);
    });

    it('should check parent directories for .git', () => {
      // Create nested directory structure
      const nestedDir = path.join(testDir, 'nested', 'deep', 'path');
      fs.mkdirSync(nestedDir, { recursive: true });
      fs.mkdirSync(path.join(testDir, '.git'));

      const result = getDefaultScope(nestedDir);
      expect(result).toBe(Scope.Project);
    });
  });

  describe('isEnterpriseEnabled', () => {
    it('should return false when no config exists', () => {
      const result = isEnterpriseEnabled(testDir);
      expect(result).toBe(false);
    });

    it('should return false when config does not enable enterprise', () => {
      const configDir = path.join(testDir, '.claude');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify({ scopes: { enterprise: { enabled: false } } })
      );

      const result = isEnterpriseEnabled(testDir);
      expect(result).toBe(false);
    });

    it('should return true when config enables enterprise', () => {
      const configDir = path.join(testDir, '.claude');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify({ scopes: { enterprise: { enabled: true } } })
      );

      const result = isEnterpriseEnabled(testDir);
      expect(result).toBe(true);
    });
  });

  describe('getAllAccessibleScopes', () => {
    it('should return global, project, local by default', () => {
      const context: ScopeContext = {
        cwd: testDir,
        globalMemoryPath: globalMemoryDir,
        enterpriseEnabled: false,
      };

      const result = getAllAccessibleScopes(context);

      expect(result).toContain(Scope.Global);
      expect(result).toContain(Scope.Project);
      expect(result).toContain(Scope.Local);
      expect(result).not.toContain(Scope.Enterprise);
    });

    it('should include enterprise when enabled with valid path', () => {
      const enterprisePath = fs.mkdtempSync(path.join(tmpdir(), 'enterprise-'));

      const context: ScopeContext = {
        cwd: testDir,
        globalMemoryPath: globalMemoryDir,
        enterpriseEnabled: true,
        enterprisePath,
      };

      const result = getAllAccessibleScopes(context);

      expect(result).toContain(Scope.Enterprise);
      expect(result).toContain(Scope.Global);
      expect(result).toContain(Scope.Project);
      expect(result).toContain(Scope.Local);

      fs.rmSync(enterprisePath, { recursive: true, force: true });
    });

    it('should respect scope hierarchy order', () => {
      const enterprisePath = fs.mkdtempSync(path.join(tmpdir(), 'enterprise-'));

      const context: ScopeContext = {
        cwd: testDir,
        globalMemoryPath: globalMemoryDir,
        enterpriseEnabled: true,
        enterprisePath,
      };

      const result = getAllAccessibleScopes(context);

      // Order should be: enterprise → local → project → global
      const enterpriseIdx = result.indexOf(Scope.Enterprise);
      const localIdx = result.indexOf(Scope.Local);
      const projectIdx = result.indexOf(Scope.Project);
      const globalIdx = result.indexOf(Scope.Global);

      expect(enterpriseIdx).toBeLessThan(localIdx);
      expect(localIdx).toBeLessThan(projectIdx);
      expect(projectIdx).toBeLessThan(globalIdx);

      fs.rmSync(enterprisePath, { recursive: true, force: true });
    });
  });
});
