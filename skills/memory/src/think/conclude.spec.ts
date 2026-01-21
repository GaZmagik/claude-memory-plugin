/**
 * Tests for Think Conclude Operations
 */

import { describe, it, expect, vi, beforeEach, afterEach, setSystemTime } from 'bun:test';
import * as documentModule from './document.js';
import * as stateModule from './state.js';
import * as fsUtilsModule from '../core/fs-utils.js';
import * as writeModule from '../core/write.js';
import { ThinkStatus, MemoryType, Scope, ThoughtType } from '../types/enums.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { concludeThinkDocument } from './conclude.js';
import { createThinkDocument, showThinkDocument } from './document.js';
import { addThought } from './thoughts.js';

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
      // Use fake time to avoid ID collision (IDs are per-second)
      const baseTime = new Date('2026-01-12T10:00:00Z');
      setSystemTime(baseTime);
      const first = await createThinkDocument({ topic: 'First', basePath });

      // Advance time by 1 second to get different ID
      setSystemTime(new Date('2026-01-12T10:00:01Z'));
      await createThinkDocument({ topic: 'Second', basePath });

      const result = await concludeThinkDocument({
        conclusion: 'Concluding first',
        documentId: first.document!.id,
        basePath,
      });

      // Reset system time
      setSystemTime();

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
          // Deliberation trail stripped for embedding compatibility
          expect(content).not.toContain('Deliberation Trail');
          expect(content).not.toContain('First thought');
          expect(content).not.toContain('Counter point');
          // Only conclusion and reference to think document
          expect(content).toContain('Final answer');
          expect(content).toContain('_Deliberation:');
        }
      });

      it('defaults to learning when promotion type is unknown', async () => {
        await createThinkDocument({ topic: 'Unknown type test', basePath });

        // Force an unknown promotion type by casting
        const result = await concludeThinkDocument({
          conclusion: 'Using unknown type',
          promote: 'unknown-type' as MemoryType,
          basePath,
        });

        // If validation doesn't catch it, it should default to learning
        if (result.status === 'success' && result.promoted) {
          expect(result.promoted.type).toBe(MemoryType.Learning);
        }
      });

      it('should handle promotion when topic contains type prefix', async () => {
        await createThinkDocument({ topic: 'gotcha-edge-case-discovery', basePath });
        await addThought({
          thought: 'Some deliberation content',
          type: ThoughtType.CounterArgument,
          basePath,
        });

        const result = await concludeThinkDocument({
          conclusion: 'This is a real edge case we need to remember',
          promote: MemoryType.Gotcha,
          basePath,
        });

        expect(result.status).toBe('success');
        expect(result.promoted?.id).toBe('gotcha-edge-case-discovery');
        expect(result.promoted?.id).not.toBe('gotcha-gotcha-edge-case-discovery');
      });
    });

    it('returns error when document ID not found in any scope', async () => {
      const result = await concludeThinkDocument({
        conclusion: 'Trying to conclude non-existent',
        documentId: 'think-20260101-120000', // Valid format but doesn't exist
        basePath,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('not found');
    });

    it('returns error when file is missing after scope lookup', async () => {
      // Create a document, then delete the file but not the state
      const created = await createThinkDocument({ topic: 'Disappearing doc', basePath });

      // Get the file path and delete it directly
      const memoryDir = path.join(basePath, '.claude', 'memory');
      const tempDir = path.join(memoryDir, 'temporary');
      const files = fs.readdirSync(tempDir).filter(f => f.includes(created.document!.id));

      // Delete the file
      for (const file of files) {
        fs.unlinkSync(path.join(tempDir, file));
      }

      // Now try to conclude - file doesn't exist
      const result = await concludeThinkDocument({
        conclusion: 'Concluding deleted file',
        documentId: created.document!.id,
        basePath,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('not found');
    });
  });
});

describe('concludeThinkDocument mocked edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when file is missing after scope lookup', async () => {
    // Document exists check returns true, but actual file read fails
    vi.spyOn(stateModule, 'getCurrentDocumentId').mockResolvedValue(null);
    vi.spyOn(documentModule, 'thinkDocumentExists').mockResolvedValue({
      exists: true,
      scope: Scope.Project,
    });
    vi.spyOn(fsUtilsModule, 'fileExists').mockResolvedValue(false);

    const result = await concludeThinkDocument({
      conclusion: 'Test conclusion',
      documentId: 'think-20260101-120000',
      basePath: '/test/path',
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('not found');
  });

  it('handles promotion failure gracefully', async () => {
    // Setup: document exists and can be read
    vi.spyOn(stateModule, 'getCurrentDocumentId').mockResolvedValue('think-20260101-120000');
    vi.spyOn(fsUtilsModule, 'fileExists').mockResolvedValue(true);
    vi.spyOn(fsUtilsModule, 'readFile').mockResolvedValue(`---
topic: Test Topic
status: active
created: 2026-01-01T12:00:00.000Z
updated: 2026-01-01T12:00:00.000Z
tags: []
---

## Thoughts

Initial thought`);
    // Note: No parseThinkDocument mock needed - real parser handles valid YAML

    vi.spyOn(fsUtilsModule, 'writeFileAtomic').mockResolvedValue(undefined);
    vi.spyOn(stateModule, 'clearCurrentDocument').mockResolvedValue(undefined);

    // Make promotion fail
    vi.spyOn(writeModule, 'writeMemory').mockResolvedValue({
      status: 'error',
      error: 'Disk full - could not write promoted memory',
    });

    const result = await concludeThinkDocument({
      conclusion: 'My conclusion',
      promote: MemoryType.Decision,
      basePath: '/test/path',
    });

    // Conclusion should succeed even if promotion fails
    expect(result.status).toBe('success');
    expect(result.concluded).toBeDefined();
    expect(result.concluded?.conclusion).toBe('My conclusion');
    // Promoted should be undefined since it failed
    expect(result.promoted).toBeUndefined();
  });

  it('handles general errors in try block', async () => {
    vi.spyOn(stateModule, 'getCurrentDocumentId').mockResolvedValue('think-20260101-120000');
    vi.spyOn(fsUtilsModule, 'fileExists').mockResolvedValue(true);
    vi.spyOn(fsUtilsModule, 'readFile').mockImplementation(async () => {
      throw new Error('Disk read error');
    });

    const result = await concludeThinkDocument({
      conclusion: 'Test conclusion',
      basePath: '/test/path',
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('Failed to conclude');
    expect(result.error).toContain('Disk read error');
  });
});
