/**
 * T042: Integration test for enterprise scope (enabled and disabled)
 *
 * Tests enterprise scope storage when enabled via config.json
 * and error handling when disabled (default).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { readMemory } from '../../skills/memory/src/core/read.js';
import { listMemories } from '../../skills/memory/src/core/list.js';
import { MemoryType, Scope } from '../../skills/memory/src/types/enums.js';
import { resolveScope, isEnterpriseEnabled } from '../../skills/memory/src/scope/resolver.js';
import { getEnterprisePath } from '../../skills/memory/src/scope/enterprise.js';

describe('Enterprise Scope Storage', () => {
  let projectDir: string;
  let enterpriseDir: string;
  let globalMemoryDir: string;

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(tmpdir(), 'project-'));
    enterpriseDir = fs.mkdtempSync(path.join(tmpdir(), 'enterprise-'));
    globalMemoryDir = fs.mkdtempSync(path.join(tmpdir(), 'global-'));
    fs.mkdirSync(path.join(projectDir, '.git'));
  });

  afterEach(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
    fs.rmSync(enterpriseDir, { recursive: true, force: true });
    fs.rmSync(globalMemoryDir, { recursive: true, force: true });
  });

  describe('Enterprise disabled (default)', () => {
    it('should reject enterprise scope when not enabled in config', async () => {
      const result = resolveScope({
        requestedScope: Scope.Enterprise,
        cwd: projectDir,
        globalMemoryPath: globalMemoryDir,
        enterpriseEnabled: false,
      });

      expect(result.scope).toBeNull();
      expect(result.error).toContain('disabled');
    });

    it('should return helpful error message on enterprise scope attempt', async () => {
      // No config.json - enterprise disabled by default
      const result = resolveScope({
        requestedScope: Scope.Enterprise,
        cwd: projectDir,
        globalMemoryPath: globalMemoryDir,
        enterpriseEnabled: false,
      });

      expect(result.error).toContain('enterprise');
      expect(result.error).toMatch(/config\.json|enable/i);
    });

    it('should return true for isEnterpriseEnabled with no config (soft-enabled by default)', () => {
      // Enterprise is soft-enabled by default - still requires CLAUDE_MEMORY_ENTERPRISE_PATH
      // to be configured in managed-settings.json, but the config flag defaults to true
      const result = isEnterpriseEnabled(projectDir);
      expect(result).toBe(true);
    });
  });

  describe('Enterprise enabled', () => {
    beforeEach(() => {
      // Create config.json with enterprise enabled
      const configDir = path.join(projectDir, '.claude');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify({
          scopes: {
            enterprise: { enabled: true },
          },
        })
      );
    });

    it('should return true for isEnterpriseEnabled with config', () => {
      const result = isEnterpriseEnabled(projectDir);
      expect(result).toBe(true);
    });

    it('should resolve enterprise scope with valid path', () => {
      const result = resolveScope({
        requestedScope: Scope.Enterprise,
        cwd: projectDir,
        globalMemoryPath: globalMemoryDir,
        enterpriseEnabled: true,
        enterprisePath: enterpriseDir,
      });

      expect(result.scope).toBe(Scope.Enterprise);
      expect(result.path).toBe(enterpriseDir);
    });

    it('should reject enterprise scope when enabled but no path configured', () => {
      const result = resolveScope({
        requestedScope: Scope.Enterprise,
        cwd: projectDir,
        globalMemoryPath: globalMemoryDir,
        enterpriseEnabled: true,
        enterprisePath: undefined,
      });

      expect(result.scope).toBeNull();
      expect(result.error).toMatch(/path|configured|CLAUDE_MEMORY_ENTERPRISE_PATH/i);
    });

    it('should write to enterprise path when enabled and configured', async () => {
      const result = await writeMemory({
        title: 'Enterprise Decision',
        type: MemoryType.Decision,
        content: 'Organisation-wide decision',
        tags: ['enterprise', 'policy'],
        scope: Scope.Enterprise,
        basePath: enterpriseDir,
      });

      expect(result.status).toBe('success');

      // Verify file is in enterprise directory (in permanent/ subdirectory)
      const permanentDir = path.join(enterpriseDir, 'permanent');
      const files = fs.readdirSync(permanentDir);
      expect(files.some(f => f.includes('decision-enterprise-decision'))).toBe(true);
    });

    it('should read enterprise memory by ID', async () => {
      const writeResult = await writeMemory({
        title: 'Readable Enterprise',
        type: MemoryType.Artifact,
        content: 'Shared template',
        tags: ['template'],
        scope: Scope.Enterprise,
        basePath: enterpriseDir,
      });

      const memoryId = writeResult.memory?.id ?? '';

      const readResult = await readMemory({
        id: memoryId,
        basePath: enterpriseDir,
      });

      expect(readResult.status).toBe('success');
      expect(readResult.memory?.frontmatter.title).toBe('Readable Enterprise');
    });

    it('should list enterprise memories', async () => {
      await writeMemory({
        title: 'Enterprise Memory 1',
        type: MemoryType.Decision,
        content: 'Content 1',
        tags: ['org'],
        scope: Scope.Enterprise,
        basePath: enterpriseDir,
      });

      await writeMemory({
        title: 'Enterprise Memory 2',
        type: MemoryType.Artifact,
        content: 'Content 2',
        tags: ['org'],
        scope: Scope.Enterprise,
        basePath: enterpriseDir,
      });

      const result = await listMemories({
        basePath: enterpriseDir,
        scope: Scope.Enterprise,
      });

      expect(result.status).toBe('success');
      expect(result.memories?.length).toBe(2);
    });
  });

  describe('Enterprise path from managed-settings.json', () => {
    it('should read enterprise path from CLAUDE_MEMORY_ENTERPRISE_PATH env var', () => {
      // Simulate managed-settings.json with env var
      const managedSettingsDir = fs.mkdtempSync(path.join(tmpdir(), 'managed-'));
      fs.writeFileSync(
        path.join(managedSettingsDir, 'managed-settings.json'),
        JSON.stringify({
          env: {
            CLAUDE_MEMORY_ENTERPRISE_PATH: enterpriseDir,
          },
        })
      );

      const result = getEnterprisePath(managedSettingsDir);
      expect(result).toBe(enterpriseDir);

      fs.rmSync(managedSettingsDir, { recursive: true, force: true });
    });

    it('should return undefined when managed-settings.json missing', () => {
      const result = getEnterprisePath('/nonexistent/path');
      expect(result).toBeUndefined();
    });

    it('should return undefined when env var not set in managed-settings', () => {
      const managedSettingsDir = fs.mkdtempSync(path.join(tmpdir(), 'managed-'));
      fs.writeFileSync(
        path.join(managedSettingsDir, 'managed-settings.json'),
        JSON.stringify({ env: {} })
      );

      const result = getEnterprisePath(managedSettingsDir);
      expect(result).toBeUndefined();

      fs.rmSync(managedSettingsDir, { recursive: true, force: true });
    });
  });

  describe('Enterprise path accessibility', () => {
    it('should handle inaccessible enterprise path gracefully', () => {
      const result = resolveScope({
        requestedScope: Scope.Enterprise,
        cwd: projectDir,
        globalMemoryPath: globalMemoryDir,
        enterpriseEnabled: true,
        enterprisePath: '/nonexistent/enterprise/path',
      });

      // Should fail with informative error
      expect(result.scope).toBeNull();
      expect(result.error).toMatch(/inaccessible|not exist|cannot access/i);
    });
  });
});
