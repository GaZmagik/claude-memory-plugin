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
  mergeMemoriesFromScopes,
  buildScopeContext,
  type ScopeContext,
} from './resolver.js';
import { Scope } from '../types/enums.js';

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

  describe('resolveScope without requestedScope', () => {
    it('should use default scope when no scope requested', () => {
      // In non-git directory, default is Global
      const result = resolveScope({
        cwd: testDir,
        globalMemoryPath: globalMemoryDir,
      });

      expect(result.scope).toBe(Scope.Global);
      expect(result.path).toBe(globalMemoryDir);
    });

    it('should use project scope as default in git repo', () => {
      fs.mkdirSync(path.join(testDir, '.git'));

      const result = resolveScope({
        cwd: testDir,
        globalMemoryPath: globalMemoryDir,
      });

      expect(result.scope).toBe(Scope.Project);
    });

    it('should handle unknown scope value', () => {
      const result = resolveScope({
        requestedScope: 'invalid-scope' as Scope,
        cwd: testDir,
        globalMemoryPath: globalMemoryDir,
      });

      expect(result.scope).toBeNull();
      expect(result.error).toContain('Unknown scope');
    });
  });

  describe('getDefaultScope with config', () => {
    it('should use configured default scope', () => {
      const configDir = path.join(testDir, '.claude');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify({ scopes: { default: 'global' } })
      );

      const result = getDefaultScope(testDir);
      expect(result).toBe(Scope.Global);
    });

    it('should ignore invalid configured default scope', () => {
      const configDir = path.join(testDir, '.claude');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify({ scopes: { default: 'invalid-scope' } })
      );

      // Should fall back to default behavior (global when no git)
      const result = getDefaultScope(testDir);
      expect(result).toBe(Scope.Global);
    });
  });

  describe('mergeMemoriesFromScopes', () => {
    it('should merge memories from accessible scopes', async () => {
      // Create project memory with index
      const projectMemoryDir = path.join(testDir, '.claude', 'memory');
      fs.mkdirSync(projectMemoryDir, { recursive: true });
      fs.writeFileSync(
        path.join(projectMemoryDir, 'index.json'),
        JSON.stringify({
          memories: [
            { id: 'memory-1', type: 'decision', title: 'Test', tags: [], created: '2026-01-01', updated: '2026-01-01' },
          ],
        })
      );

      const context: ScopeContext = {
        cwd: testDir,
        globalMemoryPath: globalMemoryDir,
        enterpriseEnabled: false,
      };

      const result = await mergeMemoriesFromScopes(context);

      expect(result.memories.length).toBeGreaterThan(0);
      expect(result.scopesSearched).toContain(Scope.Project);
    });

    it('should skip scopes with no index.json', async () => {
      // Create empty memory directory (no index.json)
      const projectMemoryDir = path.join(testDir, '.claude', 'memory');
      fs.mkdirSync(projectMemoryDir, { recursive: true });

      const context: ScopeContext = {
        cwd: testDir,
        globalMemoryPath: globalMemoryDir,
        enterpriseEnabled: false,
      };

      const result = await mergeMemoriesFromScopes(context);

      expect(result.memories).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should handle invalid JSON in index.json', async () => {
      const projectMemoryDir = path.join(testDir, '.claude', 'memory');
      fs.mkdirSync(projectMemoryDir, { recursive: true });
      fs.writeFileSync(
        path.join(projectMemoryDir, 'index.json'),
        '{ invalid json }'
      );

      const context: ScopeContext = {
        cwd: testDir,
        globalMemoryPath: globalMemoryDir,
        enterpriseEnabled: false,
      };

      const result = await mergeMemoriesFromScopes(context);

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should skip scopes with non-existent paths', async () => {
      const context: ScopeContext = {
        cwd: testDir,
        globalMemoryPath: '/non-existent-path-12345',
        enterpriseEnabled: false,
      };

      const result = await mergeMemoriesFromScopes(context);

      // Should not error, just return empty results for that scope
      expect(result.scopesSearched).toContain(Scope.Global);
    });
  });

  describe('buildScopeContext', () => {
    it('should build context with enterprise disabled by default', () => {
      const context = buildScopeContext(testDir, globalMemoryDir);

      expect(context.cwd).toBe(testDir);
      expect(context.globalMemoryPath).toBe(globalMemoryDir);
      expect(context.enterpriseEnabled).toBe(false);
      expect(context.enterprisePath).toBeUndefined();
    });

    it('should build context with enterprise enabled when configured', () => {
      const configDir = path.join(testDir, '.claude');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify({ scopes: { enterprise: { enabled: true } } })
      );

      const context = buildScopeContext(testDir, globalMemoryDir);

      expect(context.enterpriseEnabled).toBe(true);
    });
  });

  describe('getScopePath with enterprise', () => {
    it('should return enterprise path for enterprise scope', () => {
      const enterprisePath = '/enterprise/memory';
      const result = getScopePath(Scope.Enterprise, testDir, globalMemoryDir, enterprisePath);

      expect(result).toBe(enterprisePath);
    });

    it('should return empty string for enterprise scope without path', () => {
      const result = getScopePath(Scope.Enterprise, testDir, globalMemoryDir);

      expect(result).toBe('');
    });
  });
});
