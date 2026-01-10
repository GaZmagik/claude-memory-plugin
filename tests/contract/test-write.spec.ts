/**
 * T015: Contract test for WriteMemoryRequest/Response
 *
 * Tests the write memory operation contract.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { MemoryType, Scope, Severity } from '../../skills/memory/src/types/enums.js';
import type { WriteMemoryRequest, WriteMemoryResponse } from '../../skills/memory/src/types/api.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

describe('writeMemory contract', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'memory-write-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should create memory file with valid request', async () => {
    const request: WriteMemoryRequest = {
      title: 'Test Decision',
      type: MemoryType.Decision,
      content: '# Test Decision\n\nThis is a test.',
      tags: ['test', 'contract'],
      scope: Scope.Global,
      basePath: testDir,
    };

    const response = await writeMemory(request);

    expect(response.status).toBe('success');
    expect(response.memory).toBeDefined();
    expect(response.memory?.id).toMatch(/^decision-test-decision/);
    expect(response.memory?.filePath).toBeDefined();
    expect(fs.existsSync(response.memory?.filePath ?? '')).toBe(true);
  });

  it('should return error for invalid type', async () => {
    const request = {
      title: 'Invalid Type',
      type: 'invalid' as MemoryType,
      content: 'Content',
      tags: [],
      scope: Scope.Global,
      basePath: testDir,
    } as WriteMemoryRequest;

    const response = await writeMemory(request);

    expect(response.status).toBe('error');
    expect(response.error).toContain('type');
  });

  it('should return error for empty title', async () => {
    const request: WriteMemoryRequest = {
      title: '',
      type: MemoryType.Learning,
      content: 'Content',
      tags: [],
      scope: Scope.Global,
      basePath: testDir,
    };

    const response = await writeMemory(request);

    expect(response.status).toBe('error');
    expect(response.error).toContain('title');
  });

  it('should handle slug collision', async () => {
    const request: WriteMemoryRequest = {
      title: 'Duplicate Title',
      type: MemoryType.Artifact,
      content: 'First content',
      tags: [],
      scope: Scope.Global,
      basePath: testDir,
    };

    const first = await writeMemory(request);
    const second = await writeMemory({ ...request, content: 'Second content' });

    expect(first.status).toBe('success');
    expect(second.status).toBe('success');
    expect(first.memory?.id).not.toBe(second.memory?.id);
  });

  it('should create directory structure if not exists', async () => {
    const nestedPath = path.join(testDir, 'nested', 'path');
    const request: WriteMemoryRequest = {
      title: 'Nested Memory',
      type: MemoryType.Gotcha,
      content: 'Warning content',
      tags: ['warning'],
      scope: Scope.Global,
      basePath: nestedPath,
    };

    const response = await writeMemory(request);

    expect(response.status).toBe('success');
    expect(fs.existsSync(nestedPath)).toBe(true);
  });

  it('should include severity for gotcha type', async () => {
    const request: WriteMemoryRequest = {
      title: 'Important Gotcha',
      type: MemoryType.Gotcha,
      content: 'Watch out for this!',
      tags: ['warning'],
      scope: Scope.Global,
      basePath: testDir,
      severity: Severity.High,
    };

    const response = await writeMemory(request);

    expect(response.status).toBe('success');
    expect(response.memory?.frontmatter.severity).toBe('high');
  });

  it('should update index after write', async () => {
    const request: WriteMemoryRequest = {
      title: 'Indexed Memory',
      type: MemoryType.Learning,
      content: 'Learning content',
      tags: ['indexed'],
      scope: Scope.Global,
      basePath: testDir,
    };

    const response = await writeMemory(request);
    const indexPath = path.join(testDir, 'index.json');

    expect(response.status).toBe('success');
    expect(fs.existsSync(indexPath)).toBe(true);

    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    expect(index.entries.some((e: { id: string }) => e.id === response.memory?.id)).toBe(true);
  });
});
