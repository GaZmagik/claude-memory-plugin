/**
 * Integration Tests for Backward Compatibility v1.3 (Phase G - T133)
 *
 * Verifies that existing (pre-agent-scope) commands work unchanged.
 * All operations without --agent flag should behave identically to v1.2.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { readMemory } from '../../skills/memory/src/core/read.js';
import { deleteMemory } from '../../skills/memory/src/core/delete.js';
import { linkMemories } from '../../skills/memory/src/graph/link.js';
import { loadIndex } from '../../skills/memory/src/core/index.js';
import { Scope, MemoryType } from '../../skills/memory/src/types/enums.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('Backward compatibility v1.3 (no --agent flag)', () => {
  let testDir: string;
  let memoryDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'compat-v13-test-'));
    memoryDir = path.join(testDir, '.claude', 'memory');
    fs.mkdirSync(path.join(testDir, '.git'));
    fs.mkdirSync(memoryDir, { recursive: true });
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Write operations without agent', () => {
    it('should write to project scope without agent field', async () => {
      const result = await writeMemory({
        id: 'learning-compat-write',
        type: MemoryType.Learning,
        title: 'Compat Write Test',
        content: 'Written without agent scope.',
        tags: ['testing', 'compat'],
        scope: Scope.Project,
        basePath: memoryDir,
      });

      expect(result.status).toBe('success');
      expect(result.memory?.agent).toBeUndefined();
    });

    it('should store memory in project directory not agents/', async () => {
      await writeMemory({
        id: 'learning-compat-location',
        type: MemoryType.Learning,
        title: 'Location Test',
        content: 'Should be in project scope.',
        tags: ['testing'],
        scope: Scope.Project,
        basePath: memoryDir,
      });

      const projectFile = path.join(memoryDir, 'permanent', 'learning-compat-location.md');
      expect(fs.existsSync(projectFile)).toBe(true);

      // Should NOT be in agents/ directory
      const agentsDir = path.join(memoryDir, 'agents');
      expect(fs.existsSync(agentsDir)).toBe(false);
    });
  });

  describe('Read operations without agent', () => {
    it('should read project-scope memories without agent field', async () => {
      await writeMemory({
        id: 'decision-compat-read',
        type: MemoryType.Decision,
        title: 'Compat Read Test',
        content: 'Readable without agent scope.',
        tags: ['testing'],
        scope: Scope.Project,
        basePath: memoryDir,
      });

      const result = await readMemory({
        id: 'decision-compat-read',
        basePath: memoryDir,
      });

      expect(result.status).toBe('success');
      expect(result.memory!.frontmatter.title).toBe('Compat Read Test');
    });
  });

  describe('Delete operations without agent', () => {
    it('should delete project-scope memories without agent field', async () => {
      await writeMemory({
        id: 'gotcha-compat-delete',
        type: MemoryType.Gotcha,
        title: 'Compat Delete Test',
        content: 'Will be deleted without agent scope.',
        tags: ['testing'],
        scope: Scope.Project,
        basePath: memoryDir,
      });

      const deleteResult = await deleteMemory({
        id: 'gotcha-compat-delete',
        basePath: memoryDir,
      });
      expect(deleteResult.status).toBe('success');

      const readResult = await readMemory({
        id: 'gotcha-compat-delete',
        basePath: memoryDir,
      });
      expect(readResult.status).toBe('error');
    });
  });

  describe('Link operations without agent', () => {
    it('should link project-scope memories without agent field', async () => {
      await writeMemory({
        id: 'decision-compat-link-src',
        type: MemoryType.Decision,
        title: 'Link Source',
        content: 'Source for linking.',
        tags: ['testing'],
        scope: Scope.Project,
        basePath: memoryDir,
      });

      await writeMemory({
        id: 'learning-compat-link-tgt',
        type: MemoryType.Learning,
        title: 'Link Target',
        content: 'Target for linking.',
        tags: ['testing'],
        scope: Scope.Project,
        basePath: memoryDir,
      });

      const linkResult = await linkMemories({
        source: 'decision-compat-link-src',
        target: 'learning-compat-link-tgt',
        basePath: memoryDir,
      });

      expect(linkResult.status).toBe('success');
    });
  });

  describe('Index operations without agent', () => {
    it('should maintain index.json in project scope', async () => {
      await writeMemory({
        id: 'artifact-compat-index',
        type: MemoryType.Artifact,
        title: 'Index Test',
        content: 'Should appear in project index.',
        tags: ['testing'],
        scope: Scope.Project,
        basePath: memoryDir,
      });

      const index = await loadIndex({ basePath: memoryDir });
      const entry = index.memories.find(m => m.id === 'artifact-compat-index');
      expect(entry).toBeDefined();
      expect(entry!.title).toBe('Index Test');
    });
  });

  describe('Coexistence with agent-scoped memories', () => {
    it('should keep project and agent memories separate', async () => {
      // Write a project-scope memory
      await writeMemory({
        id: 'learning-coexist-project',
        type: MemoryType.Learning,
        title: 'Project Memory',
        content: 'Lives in project scope.',
        tags: ['testing'],
        scope: Scope.Project,
        basePath: memoryDir,
      });

      // Write an agent-scoped memory
      await writeMemory({
        id: 'learning-coexist-agent',
        type: MemoryType.Learning,
        title: 'Agent Memory',
        content: 'Lives in agent scope.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'test-agent',
        projectRoot: testDir,
      });

      // Project index should only contain project memory
      const projectIndex = await loadIndex({ basePath: memoryDir });
      const projectIds = projectIndex.memories.map(m => m.id);
      expect(projectIds).toContain('learning-coexist-project');
      expect(projectIds).not.toContain('learning-coexist-agent');

      // Agent index should only contain agent memory
      const agentDir = path.join(memoryDir, 'agents', 'test-agent');
      const agentIndex = await loadIndex({ basePath: agentDir });
      const agentIds = agentIndex.memories.map(m => m.id);
      expect(agentIds).toContain('learning-coexist-agent');
      expect(agentIds).not.toContain('learning-coexist-project');
    });
  });
});
