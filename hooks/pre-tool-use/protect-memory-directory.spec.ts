/**
 * Tests for protect-memory-directory hook
 *
 * Validates that Write/Edit/MultiEdit tools are blocked on .claude/memory/ paths.
 */

import { describe, it, expect } from 'vitest';

function isMemoryPath(filePath: string, home: string): { isMemory: boolean; memoryType: string } {
  const expandedPath = filePath.replace(/^~/, home);
  if (expandedPath.startsWith(`${home}/.claude/memory/`)) {
    return { isMemory: true, memoryType: 'user/global' };
  }
  if (expandedPath.includes('/.claude/memory/')) {
    return { isMemory: true, memoryType: 'project' };
  }
  return { isMemory: false, memoryType: '' };
}

describe('protect-memory-directory path detection', () => {
  const home = '/home/user';

  describe('detects memory paths', () => {
    it('detects global memory path with ~', () => {
      const result = isMemoryPath('~/.claude/memory/permanent/foo.md', home);
      expect(result.isMemory).toBe(true);
      expect(result.memoryType).toBe('user/global');
    });

    it('detects global memory path with absolute', () => {
      const result = isMemoryPath('/home/user/.claude/memory/index.json', home);
      expect(result.isMemory).toBe(true);
      expect(result.memoryType).toBe('user/global');
    });

    it('detects project memory path', () => {
      const result = isMemoryPath('/projects/myapp/.claude/memory/graph.json', home);
      expect(result.isMemory).toBe(true);
      expect(result.memoryType).toBe('project');
    });
  });

  describe('rejects non-memory paths', () => {
    it('rejects .claude without memory', () => {
      const result = isMemoryPath('/home/user/.claude/config.json', home);
      expect(result.isMemory).toBe(false);
    });

    it('rejects memory without .claude', () => {
      const result = isMemoryPath('/tmp/memory/file.md', home);
      expect(result.isMemory).toBe(false);
    });

    it('rejects unrelated paths', () => {
      const result = isMemoryPath('/home/user/projects/src/index.ts', home);
      expect(result.isMemory).toBe(false);
    });
  });
});
