/**
 * T018: Contract test for DeleteMemoryRequest/Response
 *
 * Tests the delete memory operation contract.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { deleteMemory } from '../../skills/memory/src/core/delete.js';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { readMemory } from '../../skills/memory/src/core/read.js';
import { MemoryType, Scope } from '../../skills/memory/src/types/enums.js';
import type { DeleteMemoryRequest } from '../../skills/memory/src/types/api.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

describe('deleteMemory contract', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'memory-delete-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should delete existing memory', async () => {
    // Create a memory first
    const writeResult = await writeMemory({
      title: 'To Delete',
      type: MemoryType.Decision,
      content: 'This will be deleted',
      tags: [],
      scope: Scope.Global,
      basePath: testDir,
    });

    const memoryId = writeResult.memory?.id ?? '';
    const filePath = writeResult.memory?.filePath ?? '';

    const request: DeleteMemoryRequest = {
      id: memoryId,
      basePath: testDir,
    };

    const response = await deleteMemory(request);

    expect(response.status).toBe('success');
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('should return error for non-existent memory', async () => {
    const request: DeleteMemoryRequest = {
      id: 'nonexistent-memory',
      basePath: testDir,
    };

    const response = await deleteMemory(request);

    expect(response.status).toBe('error');
    expect(response.error).toContain('not found');
  });

  it('should remove from index after delete', async () => {
    const writeResult = await writeMemory({
      title: 'Indexed Delete',
      type: MemoryType.Learning,
      content: 'Will be removed from index',
      tags: [],
      scope: Scope.Global,
      basePath: testDir,
    });

    const memoryId = writeResult.memory?.id ?? '';

    await deleteMemory({
      id: memoryId,
      basePath: testDir,
    });

    const indexPath = path.join(testDir, 'index.json');
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

    expect(index.entries.some((e: { id: string }) => e.id === memoryId)).toBe(false);
  });

  it('should confirm memory is not readable after delete', async () => {
    const writeResult = await writeMemory({
      title: 'Confirm Delete',
      type: MemoryType.Artifact,
      content: 'Should not be readable',
      tags: [],
      scope: Scope.Global,
      basePath: testDir,
    });

    const memoryId = writeResult.memory?.id ?? '';

    await deleteMemory({
      id: memoryId,
      basePath: testDir,
    });

    const readResult = await readMemory({
      id: memoryId,
      basePath: testDir,
    });

    expect(readResult.status).toBe('error');
  });

  it('should return error for empty id', async () => {
    const request: DeleteMemoryRequest = {
      id: '',
      basePath: testDir,
    };

    const response = await deleteMemory(request);

    expect(response.status).toBe('error');
    expect(response.error).toContain('id');
  });
});
