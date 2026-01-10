/**
 * T016: Contract test for ReadMemoryRequest/Response
 *
 * Tests the read memory operation contract.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readMemory } from '../../skills/memory/src/core/read.js';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { MemoryType, Scope } from '../../skills/memory/src/types/enums.js';
import type { ReadMemoryRequest } from '../../skills/memory/src/types/api.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

describe('readMemory contract', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'memory-read-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should read existing memory by id', async () => {
    // Setup: create a memory first
    await writeMemory({
      title: 'Read Test',
      type: MemoryType.Decision,
      content: '# Read Test\n\nContent to read.',
      tags: ['test'],
      scope: Scope.Global,
      basePath: testDir,
    });

    const request: ReadMemoryRequest = {
      id: 'decision-read-test',
      basePath: testDir,
    };

    const response = await readMemory(request);

    expect(response.status).toBe('success');
    expect(response.memory).toBeDefined();
    expect(response.memory?.frontmatter.title).toBe('Read Test');
    expect(response.memory?.content).toContain('Content to read');
  });

  it('should return error for non-existent memory', async () => {
    const request: ReadMemoryRequest = {
      id: 'nonexistent-memory',
      basePath: testDir,
    };

    const response = await readMemory(request);

    expect(response.status).toBe('error');
    expect(response.error).toContain('not found');
  });

  it('should return error for empty id', async () => {
    const request: ReadMemoryRequest = {
      id: '',
      basePath: testDir,
    };

    const response = await readMemory(request);

    expect(response.status).toBe('error');
    expect(response.error).toContain('id');
  });

  it('should include full memory with frontmatter and content', async () => {
    await writeMemory({
      title: 'Full Memory',
      type: MemoryType.Gotcha,
      content: '# Warning\n\nImportant gotcha here.',
      tags: ['warning', 'important'],
      scope: Scope.Global,
      basePath: testDir,
      severity: 'high',
    });

    const response = await readMemory({
      id: 'gotcha-full-memory',
      basePath: testDir,
    });

    expect(response.status).toBe('success');
    expect(response.memory?.frontmatter.type).toBe(MemoryType.Gotcha);
    expect(response.memory?.frontmatter.tags).toContain('warning');
    expect(response.memory?.frontmatter.severity).toBe('high');
    expect(response.memory?.content).toContain('Important gotcha');
  });

  it('should handle memory with links', async () => {
    await writeMemory({
      title: 'Linked Memory',
      type: MemoryType.Learning,
      content: 'Learning with links',
      tags: [],
      scope: Scope.Global,
      basePath: testDir,
      links: ['decision-related', 'artifact-pattern'],
    });

    const response = await readMemory({
      id: 'learning-linked-memory',
      basePath: testDir,
    });

    expect(response.status).toBe('success');
    expect(response.memory?.frontmatter.links).toContain('decision-related');
    expect(response.memory?.frontmatter.links).toContain('artifact-pattern');
  });
});
