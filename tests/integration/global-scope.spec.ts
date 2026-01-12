/**
 * T039: Integration test for global scope storage
 *
 * Tests that memories with global scope are stored in ~/.claude/memory/
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { readMemory } from '../../skills/memory/src/core/read.js';
import { listMemories } from '../../skills/memory/src/core/list.js';
import { MemoryType, Scope } from '../../skills/memory/src/types/enums.js';
import { getScopePath } from '../../skills/memory/src/scope/resolver.js';

describe('Global Scope Storage', () => {
  let projectDir: string;
  let globalMemoryDir: string;

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(tmpdir(), 'project-'));
    globalMemoryDir = fs.mkdtempSync(path.join(tmpdir(), 'global-memory-'));
    // Create .git to simulate project context
    fs.mkdirSync(path.join(projectDir, '.git'));
  });

  afterEach(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
    fs.rmSync(globalMemoryDir, { recursive: true, force: true });
  });

  it('should store global scope memory in ~/.claude/memory/', async () => {
    const result = await writeMemory({
      title: 'Global Decision',
      type: MemoryType.Decision,
      content: 'This is a global memory accessible across all projects.',
      tags: ['global', 'shared'],
      scope: Scope.Global,
      basePath: globalMemoryDir,
    });

    expect(result.status).toBe('success');

    // Verify file is in global directory
    const files = fs.readdirSync(globalMemoryDir);
    expect(files.some(f => f.includes('decision-global-decision'))).toBe(true);
  });

  it('should resolve global scope path correctly', () => {
    const globalPath = getScopePath(Scope.Global, projectDir, globalMemoryDir);
    expect(globalPath).toBe(globalMemoryDir);
  });

  it('should read global memory from any project directory', async () => {
    // Create global memory
    const writeResult = await writeMemory({
      title: 'Cross Project Memory',
      type: MemoryType.Learning,
      content: 'Accessible from anywhere',
      tags: ['global'],
      scope: Scope.Global,
      basePath: globalMemoryDir,
    });

    const memoryId = writeResult.memory?.id ?? '';

    // Create another "project" directory
    const otherProject = fs.mkdtempSync(path.join(tmpdir(), 'other-project-'));
    fs.mkdirSync(path.join(otherProject, '.git'));

    // Read from the "other project" context (using same global path)
    const readResult = await readMemory({
      id: memoryId,
      basePath: globalMemoryDir,
    });

    expect(readResult.status).toBe('success');
    expect(readResult.memory?.frontmatter.title).toBe('Cross Project Memory');

    fs.rmSync(otherProject, { recursive: true, force: true });
  });

  it('should list global memories separately from project memories', async () => {
    // Create global memory
    await writeMemory({
      title: 'Global Only',
      type: MemoryType.Decision,
      content: 'Global content',
      tags: ['global'],
      scope: Scope.Global,
      basePath: globalMemoryDir,
    });

    // Create project memory
    const projectPath = path.join(projectDir, '.claude', 'memory');
    fs.mkdirSync(projectPath, { recursive: true });

    await writeMemory({
      title: 'Project Only',
      type: MemoryType.Decision,
      content: 'Project content',
      tags: ['project'],
      scope: Scope.Project,
      basePath: projectPath,
    });

    // List global memories only
    const globalList = await listMemories({
      basePath: globalMemoryDir,
      scope: Scope.Global,
    });

    expect(globalList.status).toBe('success');
    expect(globalList.memories?.length).toBe(1);
    expect(globalList.memories?.[0]?.title).toBe('Global Only');
  });

  it('should include scope indicator in global memory', async () => {
    const result = await writeMemory({
      title: 'Scope Indicator Test',
      type: MemoryType.Decision,
      content: 'Testing scope indicator',
      tags: ['test'],
      scope: Scope.Global,
      basePath: globalMemoryDir,
    });

    expect(result.status).toBe('success');

    // Check frontmatter includes scope
    const filePath = result.memory?.filePath ?? '';
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('scope: global');
  });

  it('should maintain separate index for global scope', async () => {
    await writeMemory({
      title: 'Indexed Globally',
      type: MemoryType.Artifact,
      content: 'Pattern to share',
      tags: ['pattern'],
      scope: Scope.Global,
      basePath: globalMemoryDir,
    });

    // Check index.json exists in global directory
    const indexPath = path.join(globalMemoryDir, 'index.json');
    expect(fs.existsSync(indexPath)).toBe(true);

    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    expect(index.memories.length).toBe(1);
    expect(index.memories[0].scope).toBe(Scope.Global);
  });
});
