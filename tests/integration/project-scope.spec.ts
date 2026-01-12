/**
 * T040: Integration test for project scope storage
 *
 * Tests that memories with project scope are stored in .claude/memory/
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { readMemory } from '../../skills/memory/src/core/read.js';
import { listMemories } from '../../skills/memory/src/core/list.js';
import { MemoryType, Scope } from '../../skills/memory/src/types/enums.js';
import { getScopePath, getDefaultScope } from '../../skills/memory/src/scope/resolver.js';

describe('Project Scope Storage', () => {
  let projectDir: string;
  let projectMemoryDir: string;

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(tmpdir(), 'project-'));
    // Create .git to simulate git project
    fs.mkdirSync(path.join(projectDir, '.git'));
    // Create project memory directory
    projectMemoryDir = path.join(projectDir, '.claude', 'memory');
    fs.mkdirSync(projectMemoryDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  it('should store project scope memory in .claude/memory/', async () => {
    const result = await writeMemory({
      title: 'Project Decision',
      type: MemoryType.Decision,
      content: 'This is a project-specific decision.',
      tags: ['project', 'api'],
      scope: Scope.Project,
      basePath: projectMemoryDir,
    });

    expect(result.status).toBe('success');

    // Verify file is in project directory (in permanent/ subdirectory)
    const permanentDir = path.join(projectMemoryDir, 'permanent');
    const files = fs.readdirSync(permanentDir);
    expect(files.some(f => f.includes('decision-project-decision'))).toBe(true);
  });

  it('should resolve project scope path correctly', () => {
    const globalMemoryDir = '/home/test/.claude/memory';
    const projectPath = getScopePath(Scope.Project, projectDir, globalMemoryDir);
    expect(projectPath).toBe(path.join(projectDir, '.claude', 'memory'));
  });

  it('should default to project scope when in git repository', () => {
    const defaultScope = getDefaultScope(projectDir);
    expect(defaultScope).toBe(Scope.Project);
  });

  it('should create .claude/memory/ directory if missing', async () => {
    // Remove the memory directory
    fs.rmSync(projectMemoryDir, { recursive: true });

    const result = await writeMemory({
      title: 'Auto Create Dir',
      type: MemoryType.Learning,
      content: 'Should create directory',
      tags: ['test'],
      scope: Scope.Project,
      basePath: projectMemoryDir,
    });

    expect(result.status).toBe('success');
    expect(fs.existsSync(projectMemoryDir)).toBe(true);
  });

  it('should track project memories in project-specific index', async () => {
    await writeMemory({
      title: 'Indexed Project Memory',
      type: MemoryType.Decision,
      content: 'Content',
      tags: ['test'],
      scope: Scope.Project,
      basePath: projectMemoryDir,
    });

    await writeMemory({
      title: 'Another Project Memory',
      type: MemoryType.Learning,
      content: 'More content',
      tags: ['test'],
      scope: Scope.Project,
      basePath: projectMemoryDir,
    });

    const indexPath = path.join(projectMemoryDir, 'index.json');
    expect(fs.existsSync(indexPath)).toBe(true);

    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    expect(index.memories.length).toBe(2);
  });

  it('should support team sharing via git', async () => {
    // Project scope memories should be tracked in git (not ignored)
    // Verify file exists in a location that would be tracked

    await writeMemory({
      title: 'Team Shared',
      type: MemoryType.Decision,
      content: 'Shared with team via git',
      tags: ['team'],
      scope: Scope.Project,
      basePath: projectMemoryDir,
    });

    // Verify the file is in .claude/memory/permanent/ (tracked path)
    const permanentDir = path.join(projectMemoryDir, 'permanent');
    const files = fs.readdirSync(permanentDir);
    expect(files.some(f => f.endsWith('.md'))).toBe(true);

    // Verify file path is relative to project root
    const mdFile = files.find(f => f.endsWith('.md'));
    expect(mdFile).toBeDefined();
  });

  it('should read project memory by ID', async () => {
    const writeResult = await writeMemory({
      title: 'Read Test',
      type: MemoryType.Gotcha,
      content: 'Important warning',
      tags: ['warning'],
      scope: Scope.Project,
      basePath: projectMemoryDir,
    });

    const memoryId = writeResult.memory?.id ?? '';

    const readResult = await readMemory({
      id: memoryId,
      basePath: projectMemoryDir,
    });

    expect(readResult.status).toBe('success');
    expect(readResult.memory?.frontmatter.title).toBe('Read Test');
    expect(readResult.memory?.frontmatter.scope).toBe(Scope.Project);
  });

  it('should list all project scope memories', async () => {
    await writeMemory({
      title: 'Project Memory 1',
      type: MemoryType.Decision,
      content: 'Content 1',
      tags: ['test'],
      scope: Scope.Project,
      basePath: projectMemoryDir,
    });

    await writeMemory({
      title: 'Project Memory 2',
      type: MemoryType.Learning,
      content: 'Content 2',
      tags: ['test'],
      scope: Scope.Project,
      basePath: projectMemoryDir,
    });

    const result = await listMemories({
      basePath: projectMemoryDir,
      scope: Scope.Project,
    });

    expect(result.status).toBe('success');
    expect(result.memories?.length).toBe(2);
    expect(result.memories?.every(m => m.scope === Scope.Project)).toBe(true);
  });
});
