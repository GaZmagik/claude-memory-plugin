/**
 * Tests for Think Thought Operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  addThought,
  addCounterArgument,
  addBranch,
  useThinkDocument,
  getCurrentThinkContext,
} from './thoughts.js';
import { createThinkDocument } from './document.js';
import { ThoughtType, Scope } from '../types/enums.js';

describe('think/thoughts', () => {
  let tempDir: string;
  let basePath: string;
  let globalPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'think-thoughts-'));
    basePath = path.join(tempDir, 'project');
    globalPath = path.join(tempDir, 'global', '.claude', 'memory');
    fs.mkdirSync(path.join(basePath, '.claude', 'memory'), { recursive: true });
    fs.mkdirSync(globalPath, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('addThought', () => {
    it('adds thought to current document', async () => {
      await createThinkDocument({ topic: 'Test', basePath });

      const result = await addThought({
        thought: 'My first thought',
        type: ThoughtType.Thought,
        basePath,
      });

      expect(result.status).toBe('success');
      expect(result.thought?.content).toBe('My first thought');
      expect(result.thought?.type).toBe(ThoughtType.Thought);
    });

    it('adds thought to specific document', async () => {
      const created = await createThinkDocument({ topic: 'Test', basePath });

      const result = await addThought({
        thought: 'Targeted thought',
        type: ThoughtType.Thought,
        documentId: created.document!.id,
        basePath,
      });

      expect(result.status).toBe('success');
      expect(result.documentId).toBe(created.document!.id);
    });

    it('includes attribution when provided', async () => {
      await createThinkDocument({ topic: 'Test', basePath });

      const result = await addThought({
        thought: 'Attributed thought',
        type: ThoughtType.Thought,
        by: 'Claude',
        basePath,
      });

      expect(result.status).toBe('success');
      expect(result.thought?.by).toBe('Claude');
    });

    it('returns error when no current document', async () => {
      const result = await addThought({
        thought: 'Orphan thought',
        type: ThoughtType.Thought,
        basePath,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('No document specified');
    });

    it('returns error for non-existent document', async () => {
      const result = await addThought({
        thought: 'Ghost thought',
        type: ThoughtType.Thought,
        documentId: 'think-00000000-000000',
        basePath,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('not found');
    });

    it('returns error when file deleted after scope detection', async () => {
      // Create a document - this sets it as current in state
      const created = await createThinkDocument({ topic: 'Will be deleted', basePath });
      const docId = created.document!.id;

      // Delete the file but it's still registered in state as current
      const memoryPath = path.join(basePath, '.claude', 'memory');
      const filePath = path.join(memoryPath, 'temporary', `${docId}.md`);
      fs.unlinkSync(filePath);

      // Don't pass documentId - let it find from state
      // This means documentScope is set from state lookup (lines 65-76)
      // but then fileExists fails (lines 100-105)
      const result = await addThought({
        thought: 'Too late',
        type: ThoughtType.Thought,
        // NO documentId - uses current from state
        basePath,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('not found');
    });

    it('validates thought content', async () => {
      await createThinkDocument({ topic: 'Test', basePath });

      const result = await addThought({
        thought: '',
        type: ThoughtType.Thought,
        basePath,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('thought');
    });

    it('validates thought type', async () => {
      await createThinkDocument({ topic: 'Test', basePath });

      const result = await addThought({
        thought: 'Valid content',
        type: 'invalid' as ThoughtType,
        basePath,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('type');
    });

    it('handles parse errors gracefully', async () => {
      // Create a document
      const created = await createThinkDocument({ topic: 'Will be corrupted', basePath });
      const docId = created.document!.id;

      // Corrupt the file with invalid YAML that will cause parse to throw
      const memoryPath = path.join(basePath, '.claude', 'memory');
      const filePath = path.join(memoryPath, 'temporary', `${docId}.md`);
      // Write content that looks like frontmatter but has invalid structure
      fs.writeFileSync(filePath, '---\ntitle: [[[invalid yaml\n---\ncontent');

      const result = await addThought({
        thought: 'This will fail',
        type: ThoughtType.Thought,
        basePath,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('Failed to add thought');
    });

    it('returns error when adding to concluded document', async () => {
      const created = await createThinkDocument({ topic: 'To conclude', basePath });
      const docId = created.document!.id;

      // Manually update the document to concluded status
      const { concludeThinkDocument } = await import('./conclude.js');
      await concludeThinkDocument({
        conclusion: 'Done',
        documentId: docId,
        basePath,
      });

      const result = await addThought({
        thought: 'Too late',
        type: ThoughtType.Thought,
        documentId: docId,
        basePath,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('concluded');
    });
  });

  describe('addCounterArgument', () => {
    it('adds counter-argument thought', async () => {
      await createThinkDocument({ topic: 'Debate', basePath });

      const result = await addCounterArgument({
        thought: 'But consider this...',
        basePath,
      });

      expect(result.status).toBe('success');
      expect(result.thought?.type).toBe(ThoughtType.CounterArgument);
    });
  });

  describe('addBranch', () => {
    it('adds branch/alternative thought', async () => {
      await createThinkDocument({ topic: 'Options', basePath });

      const result = await addBranch({
        thought: 'Alternative approach',
        basePath,
      });

      expect(result.status).toBe('success');
      expect(result.thought?.type).toBe(ThoughtType.Branch);
    });
  });

  describe('useThinkDocument', () => {
    it('switches current document', async () => {
      const first = await createThinkDocument({ topic: 'First', basePath });
      // Wait to avoid ID collision (IDs are per-second)
      await new Promise(r => setTimeout(r, 1100));
      const second = await createThinkDocument({ topic: 'Second', basePath });

      // Second is now current, switch back to first
      const result = await useThinkDocument({
        documentId: first.document!.id,
        basePath,
      });

      expect(result.status).toBe('success');
      expect(result.currentId).toBe(first.document!.id);
      expect(result.previousId).toBe(second.document!.id);
    });

    it('returns topic of switched document', async () => {
      const created = await createThinkDocument({ topic: 'Switch target', basePath });

      const result = await useThinkDocument({
        documentId: created.document!.id,
        basePath,
      });

      expect(result.topic).toBe('Switch target');
    });

    it('returns error for non-existent document', async () => {
      const result = await useThinkDocument({
        documentId: 'think-00000000-000000',
        basePath,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('not found');
    });

    it('validates document ID format', async () => {
      const result = await useThinkDocument({
        documentId: 'invalid-format',
        basePath,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('documentId');
    });
  });

  describe('getCurrentThinkContext', () => {
    it('returns null when no current document', async () => {
      const result = await getCurrentThinkContext(basePath, globalPath);
      expect(result).toBeNull();
    });

    it('returns current document context', async () => {
      await createThinkDocument({ topic: 'Current topic', basePath });

      const result = await getCurrentThinkContext(basePath, globalPath);

      expect(result).not.toBeNull();
      expect(result?.topic).toBe('Current topic');
      expect(result?.documentId).toMatch(/^thought-\d{8}-\d{6,9}$/);
      expect(result?.scope).toBe(Scope.Project);
    });

    it('returns null when current document file is malformed', async () => {
      // Create a valid document first to get the state set
      const created = await createThinkDocument({ topic: 'Will be corrupted', basePath });
      const docId = created.document!.id;

      // Corrupt the file (invalid YAML)
      const memoryPath = path.join(basePath, '.claude', 'memory');
      const filePath = path.join(memoryPath, 'temporary', `${docId}.md`);
      fs.writeFileSync(filePath, 'invalid: yaml: content: [[[');

      // Should return null due to parse error, not throw
      const result = await getCurrentThinkContext(basePath, globalPath);
      expect(result).toBeNull();
    });

    it('returns null when current document file is deleted', async () => {
      // Create a valid document first
      const created = await createThinkDocument({ topic: 'Will be deleted', basePath });
      const docId = created.document!.id;

      // Delete the file but leave state pointing to it
      const memoryPath = path.join(basePath, '.claude', 'memory');
      const filePath = path.join(memoryPath, 'temporary', `${docId}.md`);
      fs.unlinkSync(filePath);

      // Should return null because file doesn't exist
      const result = await getCurrentThinkContext(basePath, globalPath);
      expect(result).toBeNull();
    });
  });
});
