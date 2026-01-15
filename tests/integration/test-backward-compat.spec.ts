/**
 * Integration tests for backward compatibility with existing memories
 * Ensures the plugin works with legacy bash-based memory files
 *
 * Note: Uses execSync for test convenience - inputs are hardcoded test values, not user input.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';

describe('Backward Compatibility', () => {
  let testDir: string;
  let memoryDir: string;

  beforeAll(() => {
    testDir = mkdtempSync(join(tmpdir(), 'backward-compat-'));
    memoryDir = join(testDir, '.claude/memory');
    mkdirSync(join(memoryDir, 'permanent'), { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  const runMemoryCommand = (args: string[]): string => {
    // Use spawnSync with argument array for safety
    const result = spawnSync('memory', args, {
      cwd: testDir,
      encoding: 'utf-8',
      env: { ...process.env, HOME: testDir },
    });
    return result.stdout || '';
  };

  describe('legacy YAML frontmatter format', () => {
    it('should read memories with minimal frontmatter', () => {
      // Create a minimal legacy-style memory
      const content = `---
id: legacy-decision
title: Legacy Decision
type: decision
---

This is a legacy decision with minimal frontmatter.
`;
      writeFileSync(join(memoryDir, 'permanent/decision-legacy-decision.md'), content);

      const result = runMemoryCommand(['read', 'legacy-decision', '--scope', 'local']);
      const parsed = JSON.parse(result);

      expect(parsed.status).toBe('success');
      expect(parsed.data.memory.frontmatter.id).toBe('legacy-decision');
      expect(parsed.data.memory.frontmatter.title).toBe('Legacy Decision');
    });

    it('should read memories with tags as string (legacy format)', () => {
      const content = `---
id: legacy-learning
title: Legacy Learning
type: learning
tags: typescript, testing
---

Learning with comma-separated tags.
`;
      writeFileSync(join(memoryDir, 'permanent/learning-legacy-learning.md'), content);

      const result = runMemoryCommand(['read', 'legacy-learning', '--scope', 'local']);
      const parsed = JSON.parse(result);

      expect(parsed.status).toBe('success');
      // Should handle both string and array formats
      expect(parsed.data.memory.frontmatter.tags).toBeDefined();
    });

    it('should read memories without created/updated timestamps', () => {
      const content = `---
id: no-timestamps
title: Memory Without Timestamps
type: gotcha
---

This gotcha has no timestamps.
`;
      writeFileSync(join(memoryDir, 'permanent/gotcha-no-timestamps.md'), content);

      const result = runMemoryCommand(['read', 'no-timestamps', '--scope', 'local']);
      const parsed = JSON.parse(result);

      expect(parsed.status).toBe('success');
      expect(parsed.data.memory.frontmatter.id).toBe('no-timestamps');
    });
  });

  describe('legacy file naming patterns', () => {
    it('should handle memories without type prefix in filename', () => {
      const content = `---
id: simple-memory
title: Simple Memory
type: artifact
---

Content here.
`;
      // Some legacy memories might not have type prefix
      writeFileSync(join(memoryDir, 'permanent/simple-memory.md'), content);

      const result = runMemoryCommand(['list', '--scope', 'local']);
      const parsed = JSON.parse(result);

      expect(parsed.status).toBe('success');
      // Should still find it via index rebuild
    });
  });

  describe('graph.json compatibility', () => {
    it('should work without graph.json file', () => {
      // No graph.json exists yet
      const graphPath = join(memoryDir, 'graph.json');
      if (existsSync(graphPath)) {
        rmSync(graphPath);
      }

      const result = runMemoryCommand(['stats', 'local']);
      const parsed = JSON.parse(result);

      expect(parsed.status).toBe('success');
      expect(parsed.data.nodes).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty graph.json', () => {
      writeFileSync(join(memoryDir, 'graph.json'), '{}');

      const result = runMemoryCommand(['stats', 'local']);
      const parsed = JSON.parse(result);

      expect(parsed.status).toBe('success');
    });

    it('should handle graph.json with only nodes', () => {
      const graphContent = {
        nodes: [{ id: 'legacy-decision' }],
      };
      writeFileSync(join(memoryDir, 'graph.json'), JSON.stringify(graphContent));

      const result = runMemoryCommand(['stats', 'local']);
      const parsed = JSON.parse(result);

      expect(parsed.status).toBe('success');
      expect(parsed.data.nodes).toBeGreaterThanOrEqual(1);
    });
  });

  describe('index.json compatibility', () => {
    it('should rebuild index from disk if missing', () => {
      const indexPath = join(memoryDir, 'index.json');
      if (existsSync(indexPath)) {
        rmSync(indexPath);
      }

      const result = runMemoryCommand(['list', '--scope', 'local']);
      const parsed = JSON.parse(result);

      expect(parsed.status).toBe('success');
      // Should have rebuilt index and found memories
    });

    it('should handle legacy index format', () => {
      // Legacy index might have different structure
      const legacyIndex = {
        version: '1.0.0',
        memories: [
          {
            id: 'legacy-decision',
            type: 'decision',
            path: 'permanent/decision-legacy-decision.md',
          },
        ],
      };
      writeFileSync(join(memoryDir, 'index.json'), JSON.stringify(legacyIndex));

      const result = runMemoryCommand(['list', '--scope', 'local']);
      const parsed = JSON.parse(result);

      expect(parsed.status).toBe('success');
    });
  });

  describe('scope resolution compatibility', () => {
    it('should detect local scope from .claude/memory path', () => {
      const result = runMemoryCommand(['status']);
      const parsed = JSON.parse(result);

      expect(parsed.status).toBe('success');
      // Should show available scopes
    });
  });
});
