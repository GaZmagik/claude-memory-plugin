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
    it('returns null when no current document', () => {
      const result = getCurrentThinkContext(basePath, globalPath);
      expect(result).toBeNull();
    });

    it('returns current document context', async () => {
      await createThinkDocument({ topic: 'Current topic', basePath });

      const result = getCurrentThinkContext(basePath, globalPath);

      expect(result).not.toBeNull();
      expect(result?.topic).toBe('Current topic');
      expect(result?.documentId).toMatch(/^think-\d{8}-\d{6,9}$/);
      expect(result?.scope).toBe(Scope.Project);
    });
  });
});
