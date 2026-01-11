/**
 * T043: Integration test for scope hierarchy resolution
 *
 * Tests the scope hierarchy: enterprise → local → project → global
 * and that memories are merged correctly from all accessible scopes.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { listMemories } from '../../skills/memory/src/core/list.js';
import { searchMemories } from '../../skills/memory/src/core/search.js';
import { MemoryType, Scope } from '../../skills/memory/src/types/enums.js';
import {
  getAllAccessibleScopes,
  mergeMemoriesFromScopes,
  type ScopeContext,
} from '../../skills/memory/src/scope/resolver.js';

describe('Scope Hierarchy Resolution', () => {
  let projectDir: string;
  let globalMemoryDir: string;
  let enterpriseDir: string;
  let projectMemoryDir: string;
  let localMemoryDir: string;

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(tmpdir(), 'project-'));
    globalMemoryDir = fs.mkdtempSync(path.join(tmpdir(), 'global-'));
    enterpriseDir = fs.mkdtempSync(path.join(tmpdir(), 'enterprise-'));

    // Create .git to simulate git project
    fs.mkdirSync(path.join(projectDir, '.git'));

    // Create all memory directories
    projectMemoryDir = path.join(projectDir, '.claude', 'memory');
    localMemoryDir = path.join(projectDir, '.claude', 'memory', 'local');
    fs.mkdirSync(projectMemoryDir, { recursive: true });
    fs.mkdirSync(localMemoryDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
    fs.rmSync(globalMemoryDir, { recursive: true, force: true });
    fs.rmSync(enterpriseDir, { recursive: true, force: true });
  });

  describe('Scope order', () => {
    it('should return scopes in hierarchy order: enterprise → local → project → global', () => {
      const context: ScopeContext = {
        cwd: projectDir,
        globalMemoryPath: globalMemoryDir,
        enterpriseEnabled: true,
        enterprisePath: enterpriseDir,
      };

      const scopes = getAllAccessibleScopes(context);

      const enterpriseIdx = scopes.indexOf(Scope.Enterprise);
      const localIdx = scopes.indexOf(Scope.Local);
      const projectIdx = scopes.indexOf(Scope.Project);
      const globalIdx = scopes.indexOf(Scope.Global);

      expect(enterpriseIdx).toBeLessThan(localIdx);
      expect(localIdx).toBeLessThan(projectIdx);
      expect(projectIdx).toBeLessThan(globalIdx);
    });

    it('should exclude enterprise when disabled', () => {
      const context: ScopeContext = {
        cwd: projectDir,
        globalMemoryPath: globalMemoryDir,
        enterpriseEnabled: false,
      };

      const scopes = getAllAccessibleScopes(context);

      expect(scopes).not.toContain(Scope.Enterprise);
      expect(scopes).toContain(Scope.Local);
      expect(scopes).toContain(Scope.Project);
      expect(scopes).toContain(Scope.Global);
    });
  });

  describe('Memory merging', () => {
    beforeEach(async () => {
      // Create memories at each scope
      await writeMemory({
        title: 'Global Pattern',
        type: MemoryType.Artifact,
        content: 'Shared across all projects',
        tags: ['shared', 'pattern'],
        scope: Scope.Global,
        basePath: globalMemoryDir,
      });

      await writeMemory({
        title: 'Project Decision',
        type: MemoryType.Decision,
        content: 'Project-specific decision',
        tags: ['project', 'api'],
        scope: Scope.Project,
        basePath: projectMemoryDir,
      });

      await writeMemory({
        title: 'Local Note',
        type: MemoryType.Learning,
        content: 'Personal note',
        tags: ['personal'],
        scope: Scope.Local,
        basePath: localMemoryDir,
      });
    });

    it('should merge memories from all scopes on list', async () => {
      const context: ScopeContext = {
        cwd: projectDir,
        globalMemoryPath: globalMemoryDir,
        enterpriseEnabled: false,
      };

      const result = await mergeMemoriesFromScopes(context);

      expect(result.memories.length).toBe(3);

      const scopes = result.memories.map(m => m.scope);
      expect(scopes).toContain(Scope.Global);
      expect(scopes).toContain(Scope.Project);
      expect(scopes).toContain(Scope.Local);
    });

    it('should include scope indicator with each merged memory', async () => {
      const context: ScopeContext = {
        cwd: projectDir,
        globalMemoryPath: globalMemoryDir,
        enterpriseEnabled: false,
      };

      const result = await mergeMemoriesFromScopes(context);

      result.memories.forEach(memory => {
        expect(memory.scope).toBeDefined();
        expect([Scope.Global, Scope.Project, Scope.Local]).toContain(memory.scope);
      });
    });

    it('should search across all accessible scopes', async () => {
      // Search for a term that exists in multiple scopes
      await writeMemory({
        title: 'Global Auth Pattern',
        type: MemoryType.Artifact,
        content: 'Authentication pattern for all projects',
        tags: ['auth'],
        scope: Scope.Global,
        basePath: globalMemoryDir,
      });

      await writeMemory({
        title: 'Project Auth Config',
        type: MemoryType.Decision,
        content: 'Authentication configuration for this project',
        tags: ['auth'],
        scope: Scope.Project,
        basePath: projectMemoryDir,
      });

      const context: ScopeContext = {
        cwd: projectDir,
        globalMemoryPath: globalMemoryDir,
        enterpriseEnabled: false,
      };

      // This simulates a cross-scope search
      const globalResults = await searchMemories({
        query: 'auth',
        basePath: globalMemoryDir,
      });

      const projectResults = await searchMemories({
        query: 'auth',
        basePath: projectMemoryDir,
      });

      expect(globalResults.results?.length).toBeGreaterThan(0);
      expect(projectResults.results?.length).toBeGreaterThan(0);
    });
  });

  describe('Scope precedence', () => {
    it('should display enterprise memories first when available', async () => {
      // Create enterprise memory
      await writeMemory({
        title: 'Enterprise Policy',
        type: MemoryType.Decision,
        content: 'Organisation policy',
        tags: ['policy'],
        scope: Scope.Enterprise,
        basePath: enterpriseDir,
      });

      const context: ScopeContext = {
        cwd: projectDir,
        globalMemoryPath: globalMemoryDir,
        enterpriseEnabled: true,
        enterprisePath: enterpriseDir,
      };

      const result = await mergeMemoriesFromScopes(context);

      // Enterprise should be first (highest precedence)
      const firstMemory = result.memories[0];
      expect(firstMemory?.scope).toBe(Scope.Enterprise);
    });

    it('should handle duplicate IDs across scopes', async () => {
      // Create memories with same ID pattern in different scopes
      await writeMemory({
        title: 'Auth Decision',
        type: MemoryType.Decision,
        content: 'Global auth approach',
        tags: ['auth'],
        scope: Scope.Global,
        basePath: globalMemoryDir,
      });

      await writeMemory({
        title: 'Auth Decision',
        type: MemoryType.Decision,
        content: 'Project-specific auth override',
        tags: ['auth'],
        scope: Scope.Project,
        basePath: projectMemoryDir,
      });

      const context: ScopeContext = {
        cwd: projectDir,
        globalMemoryPath: globalMemoryDir,
        enterpriseEnabled: false,
      };

      const result = await mergeMemoriesFromScopes(context);

      // Both should be present with different scope indicators
      const authDecisions = result.memories.filter(m =>
        m.title.includes('Auth Decision')
      );
      expect(authDecisions.length).toBe(2);

      // They should be distinguishable by scope
      const scopes = authDecisions.map(m => m.scope);
      expect(scopes).toContain(Scope.Global);
      expect(scopes).toContain(Scope.Project);
    });
  });

  describe('Partial scope availability', () => {
    it('should gracefully handle missing scope directories', async () => {
      // Remove local directory
      fs.rmSync(localMemoryDir, { recursive: true });

      const context: ScopeContext = {
        cwd: projectDir,
        globalMemoryPath: globalMemoryDir,
        enterpriseEnabled: false,
      };

      // Should not throw, just skip missing scope
      const result = await mergeMemoriesFromScopes(context);
      expect(result.memories).toBeDefined();
    });

    it('should continue with available scopes when enterprise unavailable', async () => {
      const context: ScopeContext = {
        cwd: projectDir,
        globalMemoryPath: globalMemoryDir,
        enterpriseEnabled: true,
        enterprisePath: '/nonexistent/enterprise',
      };

      const scopes = getAllAccessibleScopes(context);

      // Enterprise should be excluded due to invalid path
      expect(scopes).not.toContain(Scope.Enterprise);
      // Other scopes should still work
      expect(scopes).toContain(Scope.Global);
      expect(scopes).toContain(Scope.Project);
      expect(scopes).toContain(Scope.Local);
    });
  });
});
