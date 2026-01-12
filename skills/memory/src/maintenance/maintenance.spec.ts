/**
 * Tests for Maintenance Operations
 *
 * These tests use temporary directories for real file system operations.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renameMemory } from './rename.js';
import { moveMemory } from './move.js';
import { promoteMemory } from './promote.js';
import { archiveMemory } from './archive.js';
import { MemoryType, Scope } from '../types/enums.js';

const MOCK_FRONTMATTER = `---
title: Test Memory
type: learning
created: 2026-01-01T00:00:00Z
updated: 2026-01-01T00:00:00Z
scope: project
tags:
  - test
---

Test content here.`;

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'maintenance-test-'));
}

function setupMemoryDir(basePath: string): void {
  fs.mkdirSync(path.join(basePath, 'permanent'), { recursive: true });
  fs.mkdirSync(path.join(basePath, 'temporary'), { recursive: true });
  // Create empty graph and index
  fs.writeFileSync(
    path.join(basePath, 'graph.json'),
    JSON.stringify({ version: 1, nodes: [], edges: [] })
  );
  fs.writeFileSync(
    path.join(basePath, 'index.json'),
    JSON.stringify({ memories: [] })
  );
}

function cleanupTempDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

describe('renameMemory', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    setupMemoryDir(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('returns error when source memory not found', async () => {
    const result = await renameMemory({
      oldId: 'not-found',
      newId: 'new-id',
      basePath: tempDir,
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('Memory not found');
  });

  it('returns error when target already exists', async () => {
    // Create both old and new files
    fs.writeFileSync(path.join(tempDir, 'permanent', 'old-id.md'), MOCK_FRONTMATTER);
    fs.writeFileSync(path.join(tempDir, 'permanent', 'new-id.md'), MOCK_FRONTMATTER);

    const result = await renameMemory({
      oldId: 'old-id',
      newId: 'new-id',
      basePath: tempDir,
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('Target already exists');
  });

  it('renames file successfully', async () => {
    fs.writeFileSync(path.join(tempDir, 'permanent', 'old-id.md'), MOCK_FRONTMATTER);

    const result = await renameMemory({
      oldId: 'old-id',
      newId: 'new-id',
      basePath: tempDir,
    });

    expect(result.status).toBe('success');
    expect(result.changes.fileRenamed).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'permanent', 'new-id.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'permanent', 'old-id.md'))).toBe(false);
  });

  it('finds files in temporary directory', async () => {
    fs.writeFileSync(path.join(tempDir, 'temporary', 'temp-mem.md'), MOCK_FRONTMATTER);

    const result = await renameMemory({
      oldId: 'temp-mem',
      newId: 'renamed-temp',
      basePath: tempDir,
    });

    expect(result.status).toBe('success');
    expect(fs.existsSync(path.join(tempDir, 'temporary', 'renamed-temp.md'))).toBe(true);
  });
});

describe('moveMemory', () => {
  let sourceDir: string;
  let targetDir: string;

  beforeEach(() => {
    sourceDir = createTempDir();
    targetDir = createTempDir();
    setupMemoryDir(sourceDir);
    setupMemoryDir(targetDir);
  });

  afterEach(() => {
    cleanupTempDir(sourceDir);
    cleanupTempDir(targetDir);
  });

  it('returns error when source and target are same', async () => {
    const result = await moveMemory({
      id: 'test-id',
      sourceBasePath: sourceDir,
      targetBasePath: sourceDir,
      targetScope: Scope.Global,
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('same');
  });

  it('returns error when memory not found', async () => {
    const result = await moveMemory({
      id: 'not-found',
      sourceBasePath: sourceDir,
      targetBasePath: targetDir,
      targetScope: Scope.Global,
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('Memory not found');
  });

  it('moves file between scopes', async () => {
    fs.writeFileSync(path.join(sourceDir, 'permanent', 'test-id.md'), MOCK_FRONTMATTER);

    const result = await moveMemory({
      id: 'test-id',
      sourceBasePath: sourceDir,
      targetBasePath: targetDir,
      targetScope: Scope.Global,
    });

    expect(result.status).toBe('success');
    expect(result.changes.fileMoved).toBe(true);
    expect(fs.existsSync(path.join(targetDir, 'permanent', 'test-id.md'))).toBe(true);
    expect(fs.existsSync(path.join(sourceDir, 'permanent', 'test-id.md'))).toBe(false);
  });
});

describe('promoteMemory', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    setupMemoryDir(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('returns error when memory not found', async () => {
    const result = await promoteMemory({
      id: 'not-found',
      targetType: MemoryType.Gotcha,
      basePath: tempDir,
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('Memory not found');
  });

  it('returns success without changes when type matches', async () => {
    const gotchaFm = MOCK_FRONTMATTER.replace('type: learning', 'type: gotcha');
    fs.writeFileSync(path.join(tempDir, 'permanent', 'test-id.md'), gotchaFm);

    const result = await promoteMemory({
      id: 'test-id',
      targetType: MemoryType.Gotcha,
      basePath: tempDir,
    });

    expect(result.status).toBe('success');
    expect(result.changes.frontmatterUpdated).toBe(false);
  });

  it('updates type in frontmatter', async () => {
    fs.writeFileSync(path.join(tempDir, 'permanent', 'test-id.md'), MOCK_FRONTMATTER);

    const result = await promoteMemory({
      id: 'test-id',
      targetType: MemoryType.Gotcha,
      basePath: tempDir,
    });

    expect(result.status).toBe('success');
    expect(result.fromType).toBe('learning');
    expect(result.toType).toBe('gotcha');
    expect(result.changes.frontmatterUpdated).toBe(true);

    // Verify file content updated
    const content = fs.readFileSync(path.join(tempDir, 'permanent', 'test-id.md'), 'utf8');
    expect(content).toContain('type: gotcha');
  });

  it('moves file from temporary to permanent on promotion', async () => {
    fs.writeFileSync(path.join(tempDir, 'temporary', 'temp-id.md'), MOCK_FRONTMATTER);

    const result = await promoteMemory({
      id: 'temp-id',
      targetType: MemoryType.Decision,
      basePath: tempDir,
    });

    expect(result.status).toBe('success');
    expect(result.changes.fileMoved).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'permanent', 'temp-id.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'temporary', 'temp-id.md'))).toBe(false);
  });
});

describe('archiveMemory', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    setupMemoryDir(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('returns error when memory not found', async () => {
    const result = await archiveMemory({
      id: 'not-found',
      basePath: tempDir,
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('Memory not found');
  });

  it('archives file successfully', async () => {
    fs.writeFileSync(path.join(tempDir, 'permanent', 'test-id.md'), MOCK_FRONTMATTER);

    const result = await archiveMemory({
      id: 'test-id',
      basePath: tempDir,
    });

    expect(result.status).toBe('success');
    expect(result.changes.fileMoved).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'archive', 'test-id.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'permanent', 'test-id.md'))).toBe(false);
  });

  it('returns error when already archived', async () => {
    fs.writeFileSync(path.join(tempDir, 'permanent', 'test-id.md'), MOCK_FRONTMATTER);
    fs.mkdirSync(path.join(tempDir, 'archive'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'archive', 'test-id.md'), MOCK_FRONTMATTER);

    const result = await archiveMemory({
      id: 'test-id',
      basePath: tempDir,
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('already archived');
  });
});
