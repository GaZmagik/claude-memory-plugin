/**
 * Tests for Think Conclude Operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { concludeThinkDocument } from './conclude.js';
import { createThinkDocument, showThinkDocument } from './document.js';
import { addThought } from './thoughts.js';
import { ThinkStatus, ThoughtType, MemoryType } from '../types/enums.js';

describe('think/conclude', () => {
  let tempDir: string;
  let basePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'think-conclude-'));
    basePath = path.join(tempDir, 'project');
    fs.mkdirSync(path.join(basePath, '.claude', 'memory'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('concludeThinkDocument', () => {
    it('concludes current document', async () => {
      await createThinkDocument({ topic: 'Test deliberation', basePath });
      await addThought({
        thought: 'Initial thought',
        type: ThoughtType.Thought,
        basePath,
      });

      const result = await concludeThinkDocument({
        conclusion: 'Final decision: proceed with caution',
        basePath,
      });

      expect(result.status).toBe('success');
      expect(result.concluded?.conclusion).toBe('Final decision: proceed with caution');
    });

    it('updates document status to concluded', async () => {
      const created = await createThinkDocument({ topic: 'Test', basePath });
      await concludeThinkDocument({
        conclusion: 'Done',
        basePath,
      });

      const shown = await showThinkDocument({
        documentId: created.document!.id,
        basePath,
      });

      expect(shown.document?.frontmatter.status).toBe(ThinkStatus.Concluded);
    });

    it('adds conclusion thought to document', async () => {
      const created = await createThinkDocument({ topic: 'Test', basePath });
      await concludeThinkDocument({
        conclusion: 'My conclusion',
        basePath,
      });

      const shown = await showThinkDocument({
        documentId: created.document!.id,
        basePath,
      });

      const conclusionThought = shown.document?.thoughts.find(
        t => t.type === ThoughtType.Conclusion
      );
      expect(conclusionThought).toBeDefined();
      expect(conclusionThought?.content).toBe('My conclusion');
    });

    it('clears current document after conclusion', async () => {
      await createThinkDocument({ topic: 'Test', basePath });
      await concludeThinkDocument({
        conclusion: 'Done',
        basePath,
      });

      // Trying to show without ID should fail (no current)
      const result = await showThinkDocument({ basePath });
      expect(result.status).toBe('error');
    });

    it('returns error when no current document', async () => {
      const result = await concludeThinkDocument({
        conclusion: 'Orphan conclusion',
        basePath,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('No document specified');
    });

    it('returns error for already concluded document', async () => {
      const created = await createThinkDocument({ topic: 'Test', basePath });
      await concludeThinkDocument({
        conclusion: 'First conclusion',
        basePath,
      });

      const result = await concludeThinkDocument({
        conclusion: 'Second attempt',
        documentId: created.document!.id,
        basePath,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('already concluded');
    });

    it('validates conclusion content', async () => {
      await createThinkDocument({ topic: 'Test', basePath });

      const result = await concludeThinkDocument({
        conclusion: '',
        basePath,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('conclusion');
    });

    it('concludes specific document by ID', async () => {
      const first = await createThinkDocument({ topic: 'First', basePath });
      // Wait to avoid ID collision (IDs are per-second)
      await new Promise(r => setTimeout(r, 1100));
      await createThinkDocument({ topic: 'Second', basePath });

      const result = await concludeThinkDocument({
        conclusion: 'Concluding first',
        documentId: first.document!.id,
        basePath,
      });

      expect(result.status).toBe('success');
      expect(result.concluded?.id).toBe(first.document!.id);
    });

    describe('promotion', () => {
      it('promotes to decision memory', async () => {
        await createThinkDocument({ topic: 'Architecture choice', basePath });
        await addThought({
          thought: 'Option A is better because...',
          type: ThoughtType.Thought,
          basePath,
        });

        const result = await concludeThinkDocument({
          conclusion: 'We chose Option A',
          promote: MemoryType.Decision,
          basePath,
        });

        expect(result.status).toBe('success');
        expect(result.promoted).toBeDefined();
        expect(result.promoted?.type).toBe(MemoryType.Decision);
      });

      it('promotes to learning memory', async () => {
        await createThinkDocument({ topic: 'TDD lesson', basePath });

        const result = await concludeThinkDocument({
          conclusion: 'Always write tests first',
          promote: MemoryType.Learning,
          basePath,
        });

        expect(result.status).toBe('success');
        expect(result.promoted?.type).toBe(MemoryType.Learning);
      });

      it('promotes to gotcha memory', async () => {
        await createThinkDocument({ topic: 'Edge case discovery', basePath });

        const result = await concludeThinkDocument({
          conclusion: 'Watch out for null values',
          promote: MemoryType.Gotcha,
          basePath,
        });

        expect(result.status).toBe('success');
        expect(result.promoted?.type).toBe(MemoryType.Gotcha);
      });

      it('promotes to artifact memory', async () => {
        await createThinkDocument({ topic: 'Pattern design', basePath });

        const result = await concludeThinkDocument({
          conclusion: 'Use the factory pattern here',
          promote: MemoryType.Artifact,
          basePath,
        });

        expect(result.status).toBe('success');
        expect(result.promoted?.type).toBe(MemoryType.Artifact);
      });

      it('rejects invalid promotion type', async () => {
        await createThinkDocument({ topic: 'Test', basePath });

        const result = await concludeThinkDocument({
          conclusion: 'Done',
          promote: MemoryType.Hub, // Not a valid promotion target
          basePath,
        });

        expect(result.status).toBe('error');
        expect(result.error).toContain('promote');
      });

      it('creates promoted memory file', async () => {
        await createThinkDocument({ topic: 'Test topic', basePath });

        const result = await concludeThinkDocument({
          conclusion: 'My decision',
          promote: MemoryType.Decision,
          basePath,
        });

        expect(result.promoted?.filePath).toBeDefined();
        if (result.promoted?.filePath) {
          expect(fs.existsSync(result.promoted.filePath)).toBe(true);
        }
      });

      it('includes deliberation trail in promoted memory', async () => {
        await createThinkDocument({ topic: 'Deliberated topic', basePath });
        await addThought({
          thought: 'First thought',
          type: ThoughtType.Thought,
          basePath,
        });
        await addThought({
          thought: 'Counter point',
          type: ThoughtType.CounterArgument,
          basePath,
        });

        const result = await concludeThinkDocument({
          conclusion: 'Final answer',
          promote: MemoryType.Decision,
          basePath,
        });

        if (result.promoted?.filePath) {
          const content = fs.readFileSync(result.promoted.filePath, 'utf-8');
          expect(content).toContain('Deliberation Trail');
          expect(content).toContain('First thought');
          expect(content).toContain('Counter point');
        }
      });
    });
  });
});
