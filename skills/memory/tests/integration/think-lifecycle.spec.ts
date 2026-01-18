/**
 * Think Lifecycle Integration Tests
 *
 * Tests the complete think workflow: create → add → counter → branch → conclude → promote
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createThinkDocument, listThinkDocuments, showThinkDocument, deleteThinkDocument } from '../../src/think/document.js';
import { addThought } from '../../src/think/thoughts.js';
import { concludeThinkDocument } from '../../src/think/conclude.js';
import { Scope, ThoughtType, MemoryType } from '../../src/types/enums.js';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'think-lifecycle-'));
}

function setupMemoryDir(basePath: string): void {
  fs.mkdirSync(path.join(basePath, 'permanent'), { recursive: true });
  fs.mkdirSync(path.join(basePath, 'temporary'), { recursive: true });
  fs.writeFileSync(path.join(basePath, 'graph.json'), JSON.stringify({ version: 1, nodes: [], edges: [] }));
  fs.writeFileSync(path.join(basePath, 'index.json'), JSON.stringify({ memories: [] }));
}

function cleanupTempDir(dir: string): void {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

describe('Think Lifecycle Integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    setupMemoryDir(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('completes full lifecycle: create → add → counter → conclude', async () => {
    // Create a think document
    const createResult = await createThinkDocument({
      topic: 'Should we use Redis or PostgreSQL for caching?',
      scope: Scope.Project,
      basePath: tempDir,
    });

    expect(createResult.status).toBe('success');
    expect(createResult.document).toBeDefined();
    const documentId = createResult.document!.id;

    // Add initial thought
    const thought1 = await addThought({
      thought: 'Redis is faster for simple key-value operations',
      type: ThoughtType.Thought,
      documentId,
      basePath: tempDir,
    });
    expect(thought1.status).toBe('success');

    // Add counter-argument
    const counter = await addThought({
      thought: 'But PostgreSQL avoids additional infrastructure complexity',
      type: ThoughtType.CounterArgument,
      documentId,
      basePath: tempDir,
    });
    expect(counter.status).toBe('success');

    // Verify document content
    const showResult = await showThinkDocument({ documentId, basePath: tempDir });
    expect(showResult.status).toBe('success');
    expect(showResult.document?.rawContent).toContain('Redis is faster');
    expect(showResult.document?.rawContent).toContain('PostgreSQL avoids');

    // Conclude
    const concludeResult = await concludeThinkDocument({
      conclusion: 'Use PostgreSQL UNLOGGED tables for caching',
      documentId,
      basePath: tempDir,
    });
    expect(concludeResult.status).toBe('success');
  });

  it('promotes concluded think document to decision', async () => {
    const createResult = await createThinkDocument({
      topic: 'Which testing framework?',
      scope: Scope.Project,
      basePath: tempDir,
    });
    const documentId = createResult.document!.id;

    await addThought({
      thought: 'Vitest has better TypeScript support',
      type: ThoughtType.Thought,
      documentId,
      basePath: tempDir,
    });

    // Conclude with promotion
    const concludeResult = await concludeThinkDocument({
      conclusion: 'Use Vitest for better TypeScript integration',
      documentId,
      promote: MemoryType.Decision,
      basePath: tempDir,
    });

    expect(concludeResult.status).toBe('success');
    expect(concludeResult.promoted).toBeDefined();
    expect(concludeResult.promoted?.type).toBe(MemoryType.Decision);

    // Verify promoted memory file exists (check via file path, not ID lookup)
    const promotedPath = concludeResult.promoted!.filePath;
    expect(fs.existsSync(promotedPath)).toBe(true);

    // Verify file content is a decision
    const content = fs.readFileSync(promotedPath, 'utf8');
    expect(content).toContain('type: decision');
  });

  it('lists multiple think documents', async () => {
    // Small delay ensures different millisecond timestamps
    await createThinkDocument({ topic: 'First', scope: Scope.Project, basePath: tempDir });
    await new Promise(r => setTimeout(r, 5));
    await createThinkDocument({ topic: 'Second', scope: Scope.Project, basePath: tempDir });
    await new Promise(r => setTimeout(r, 5));
    await createThinkDocument({ topic: 'Third', scope: Scope.Project, basePath: tempDir });

    const listResult = await listThinkDocuments({ basePath: tempDir, scope: Scope.Project });
    expect(listResult.status).toBe('success');
    expect(listResult.documents?.length).toBe(3);
  });

  it('deletes think document', async () => {
    const createResult = await createThinkDocument({
      topic: 'To be deleted',
      scope: Scope.Project,
      basePath: tempDir,
    });
    const documentId = createResult.document!.id;

    const deleteResult = await deleteThinkDocument({ documentId, basePath: tempDir });
    expect(deleteResult.status).toBe('success');

    // Verify file is gone
    const filePath = path.join(tempDir, 'temporary', `${documentId}.md`);
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('handles branch thoughts', async () => {
    const createResult = await createThinkDocument({
      topic: 'Architecture decision',
      scope: Scope.Project,
      basePath: tempDir,
    });
    const documentId = createResult.document!.id;

    await addThought({ thought: 'Monolith approach', type: ThoughtType.Thought, documentId, basePath: tempDir });
    await addThought({ thought: 'Microservices alternative', type: ThoughtType.Branch, documentId, basePath: tempDir });

    const showResult = await showThinkDocument({ documentId, basePath: tempDir });
    expect(showResult.document?.rawContent).toContain('Monolith');
    expect(showResult.document?.rawContent).toContain('Microservices');
  });

  it('promotes to learning type', async () => {
    const createResult = await createThinkDocument({
      topic: 'Async patterns',
      scope: Scope.Project,
      basePath: tempDir,
    });
    const documentId = createResult.document!.id;

    await addThought({ thought: 'Promise.all for parallel ops', type: ThoughtType.Thought, documentId, basePath: tempDir });

    const concludeResult = await concludeThinkDocument({
      conclusion: 'Use Promise.all for parallel independent async',
      documentId,
      promote: MemoryType.Learning,
      basePath: tempDir,
    });

    expect(concludeResult.promoted?.type).toBe(MemoryType.Learning);
  });

  it('promotes to gotcha type', async () => {
    const createResult = await createThinkDocument({
      topic: 'Discovered gotcha',
      scope: Scope.Project,
      basePath: tempDir,
    });
    const documentId = createResult.document!.id;

    await addThought({ thought: 'vi.mock fails in bun', type: ThoughtType.Thought, documentId, basePath: tempDir });

    const concludeResult = await concludeThinkDocument({
      conclusion: 'Use vi.spyOn instead of vi.mock with bun',
      documentId,
      promote: MemoryType.Gotcha,
      basePath: tempDir,
    });

    expect(concludeResult.promoted?.type).toBe(MemoryType.Gotcha);
  });
});
