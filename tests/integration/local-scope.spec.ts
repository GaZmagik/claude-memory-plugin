/**
 * T041: Integration test for local scope storage and gitignore
 *
 * Tests that memories with local scope are stored in .claude/memory/local/
 * and that this directory is automatically added to .gitignore
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
import { ensureLocalScopeGitignored } from '../../skills/memory/src/scope/gitignore.js';

describe('Local Scope Storage', () => {
  let projectDir: string;
  let localMemoryDir: string;

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(tmpdir(), 'project-'));
    // Create .git to simulate git project
    fs.mkdirSync(path.join(projectDir, '.git'));
    // Create local memory directory
    localMemoryDir = path.join(projectDir, '.claude', 'memory', 'local');
    fs.mkdirSync(localMemoryDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  it('should store local scope memory in .claude/memory/local/', async () => {
    const result = await writeMemory({
      title: 'Personal Note',
      type: MemoryType.Learning,
      content: 'This is a personal note not shared with team.',
      tags: ['personal', 'private'],
      scope: Scope.Local,
      basePath: localMemoryDir,
    });

    expect(result.status).toBe('success');

    // Verify file is in local directory
    const files = fs.readdirSync(localMemoryDir);
    expect(files.some(f => f.includes('learning-personal-note'))).toBe(true);
  });

  it('should resolve local scope path correctly', () => {
    const globalMemoryDir = '/home/test/.claude/memory';
    const localPath = getScopePath(Scope.Local, projectDir, globalMemoryDir);
    expect(localPath).toBe(path.join(projectDir, '.claude', 'memory', 'local'));
  });

  describe('Gitignore automation', () => {
    it('should add .claude/memory/local/ to .gitignore on first local write', async () => {
      // Ensure no .gitignore exists
      const gitignorePath = path.join(projectDir, '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(false);

      // Write a local memory (should trigger gitignore automation)
      await writeMemory({
        title: 'Private Memory',
        type: MemoryType.Learning,
        content: 'Secret content',
        tags: ['private'],
        scope: Scope.Local,
        basePath: localMemoryDir,
        projectRoot: projectDir,
      });

      // Check .gitignore was created with local pattern
      expect(fs.existsSync(gitignorePath)).toBe(true);
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      expect(content).toContain('.claude/memory/local/');
    });

    it('should append to existing .gitignore without duplicates', async () => {
      const gitignorePath = path.join(projectDir, '.gitignore');
      fs.writeFileSync(gitignorePath, 'node_modules/\n.env\n');

      await writeMemory({
        title: 'Private Memory',
        type: MemoryType.Learning,
        content: 'Secret content',
        tags: ['private'],
        scope: Scope.Local,
        basePath: localMemoryDir,
        projectRoot: projectDir,
      });

      const content = fs.readFileSync(gitignorePath, 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.env');
      expect(content).toContain('.claude/memory/local/');

      // Verify no duplicates on second write
      await writeMemory({
        title: 'Another Private Memory',
        type: MemoryType.Decision,
        content: 'More secret content',
        tags: ['private'],
        scope: Scope.Local,
        basePath: localMemoryDir,
        projectRoot: projectDir,
      });

      const contentAfter = fs.readFileSync(gitignorePath, 'utf-8');
      const matches = contentAfter.match(/\.claude\/memory\/local\//g);
      expect(matches?.length).toBe(1);
    });

    it('should use ensureLocalScopeGitignored utility', () => {
      const result = ensureLocalScopeGitignored(projectDir);

      expect(result.created || result.modified).toBe(true);

      const gitignorePath = path.join(projectDir, '.gitignore');
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      expect(content).toContain('.claude/memory/local/');
    });
  });

  it('should keep local memories private (not accessible from other projects)', async () => {
    // Create a local memory
    await writeMemory({
      title: 'Private Decision',
      type: MemoryType.Decision,
      content: 'Only I should see this',
      tags: ['private'],
      scope: Scope.Local,
      basePath: localMemoryDir,
    });

    // Verify it's in local directory
    const result = await listMemories({
      basePath: localMemoryDir,
      scope: Scope.Local,
    });

    expect(result.status).toBe('success');
    expect(result.memories?.length).toBe(1);

    // Another project shouldn't see this memory
    const otherProject = fs.mkdtempSync(path.join(tmpdir(), 'other-'));
    const otherLocalPath = path.join(otherProject, '.claude', 'memory', 'local');
    fs.mkdirSync(otherLocalPath, { recursive: true });

    const otherResult = await listMemories({
      basePath: otherLocalPath,
      scope: Scope.Local,
    });

    expect(otherResult.memories?.length ?? 0).toBe(0);

    fs.rmSync(otherProject, { recursive: true, force: true });
  });

  it('should maintain separate index for local scope', async () => {
    await writeMemory({
      title: 'Local Index Test',
      type: MemoryType.Learning,
      content: 'Testing local index',
      tags: ['test'],
      scope: Scope.Local,
      basePath: localMemoryDir,
    });

    const indexPath = path.join(localMemoryDir, 'index.json');
    expect(fs.existsSync(indexPath)).toBe(true);

    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    expect(index.memories.length).toBe(1);
    expect(index.memories[0].scope).toBe(Scope.Local);
  });

  it('should support reading local memory by ID', async () => {
    const writeResult = await writeMemory({
      title: 'Readable Local',
      type: MemoryType.Gotcha,
      content: 'Personal reminder',
      tags: ['personal'],
      scope: Scope.Local,
      basePath: localMemoryDir,
    });

    const memoryId = writeResult.memory?.id ?? '';

    const readResult = await readMemory({
      id: memoryId,
      basePath: localMemoryDir,
    });

    expect(readResult.status).toBe('success');
    expect(readResult.memory?.frontmatter.title).toBe('Readable Local');
    expect(readResult.memory?.frontmatter.scope).toBe(Scope.Local);
  });
});
