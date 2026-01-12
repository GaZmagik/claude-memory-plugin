/**
 * Tests for CLI Think Commands
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { cmdThink } from './think.js';
import * as documentModule from '../../think/document.js';
import * as thoughtsModule from '../../think/thoughts.js';
import * as concludeModule from '../../think/conclude.js';
import type { ParsedArgs } from '../parser.js';

describe('cmdThink', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when subcommand is missing', async () => {
    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdThink(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing subcommand');
  });

  it('returns error for unknown subcommand', async () => {
    const args: ParsedArgs = { positional: ['unknown'], flags: {} };
    const result = await cmdThink(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Unknown think subcommand');
  });

  describe('think create', () => {
    it('returns error when topic missing', async () => {
      const args: ParsedArgs = { positional: ['create'], flags: {} };
      const result = await cmdThink(args);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Missing required argument: topic');
    });

    it('calls createThinkDocument with topic', async () => {
      vi.spyOn(documentModule, 'createThinkDocument').mockResolvedValue({
        id: 'think-123',
        topic: 'Test topic',
      } as any);

      const args: ParsedArgs = { positional: ['create', 'Test topic'], flags: {} };
      const result = await cmdThink(args);

      expect(result.status).toBe('success');
      expect(documentModule.createThinkDocument).toHaveBeenCalledWith(
        expect.objectContaining({ topic: 'Test topic' })
      );
    });
  });

  describe('think add', () => {
    it('returns error when thought missing', async () => {
      const args: ParsedArgs = { positional: ['add'], flags: {} };
      const result = await cmdThink(args);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Missing required argument: thought');
    });

    it('calls addThought with thought type', async () => {
      vi.spyOn(thoughtsModule, 'addThought').mockResolvedValue({
        status: 'success',
      } as any);

      const args: ParsedArgs = {
        positional: ['add', 'This is my thought'],
        flags: {},
      };
      const result = await cmdThink(args);

      expect(result.status).toBe('success');
      expect(thoughtsModule.addThought).toHaveBeenCalledWith(
        expect.objectContaining({
          thought: 'This is my thought',
          type: 'thought',
        })
      );
    });
  });

  describe('think counter', () => {
    it('calls addThought with counter-argument type', async () => {
      vi.spyOn(thoughtsModule, 'addThought').mockResolvedValue({
        status: 'success',
      } as any);

      const args: ParsedArgs = {
        positional: ['counter', 'But on the other hand...'],
        flags: {},
      };
      const result = await cmdThink(args);

      expect(result.status).toBe('success');
      expect(thoughtsModule.addThought).toHaveBeenCalledWith(
        expect.objectContaining({
          thought: 'But on the other hand...',
          type: 'counter-argument',
        })
      );
    });
  });

  describe('think branch', () => {
    it('calls addThought with branch type', async () => {
      vi.spyOn(thoughtsModule, 'addThought').mockResolvedValue({
        status: 'success',
      } as any);

      const args: ParsedArgs = {
        positional: ['branch', 'Alternative approach...'],
        flags: {},
      };
      const result = await cmdThink(args);

      expect(result.status).toBe('success');
      expect(thoughtsModule.addThought).toHaveBeenCalledWith(
        expect.objectContaining({
          thought: 'Alternative approach...',
          type: 'branch',
        })
      );
    });
  });

  describe('think list', () => {
    it('calls listThinkDocuments', async () => {
      vi.spyOn(documentModule, 'listThinkDocuments').mockResolvedValue({
        documents: [],
      } as any);

      const args: ParsedArgs = { positional: ['list'], flags: {} };
      const result = await cmdThink(args);

      expect(result.status).toBe('success');
      expect(documentModule.listThinkDocuments).toHaveBeenCalled();
    });
  });

  describe('think show', () => {
    it('calls showThinkDocument', async () => {
      vi.spyOn(documentModule, 'showThinkDocument').mockResolvedValue({
        id: 'think-123',
        topic: 'Test',
        thoughts: [],
      } as any);

      const args: ParsedArgs = { positional: ['show', 'think-123'], flags: {} };
      const result = await cmdThink(args);

      expect(result.status).toBe('success');
      expect(documentModule.showThinkDocument).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: 'think-123' })
      );
    });
  });

  describe('think use', () => {
    it('returns error when document ID missing', async () => {
      const args: ParsedArgs = { positional: ['use'], flags: {} };
      const result = await cmdThink(args);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Missing required argument: document ID');
    });

    it('calls useThinkDocument', async () => {
      vi.spyOn(thoughtsModule, 'useThinkDocument').mockResolvedValue({
        status: 'success',
      } as any);

      const args: ParsedArgs = { positional: ['use', 'think-456'], flags: {} };
      const result = await cmdThink(args);

      expect(result.status).toBe('success');
      expect(thoughtsModule.useThinkDocument).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: 'think-456' })
      );
    });
  });

  describe('think conclude', () => {
    it('returns error when conclusion missing', async () => {
      const args: ParsedArgs = { positional: ['conclude'], flags: {} };
      const result = await cmdThink(args);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Missing required argument: conclusion text');
    });

    it('calls concludeThinkDocument', async () => {
      vi.spyOn(concludeModule, 'concludeThinkDocument').mockResolvedValue({
        status: 'success',
        concluded: true,
      } as any);

      const args: ParsedArgs = {
        positional: ['conclude', 'Final decision made'],
        flags: {},
      };
      const result = await cmdThink(args);

      expect(result.status).toBe('success');
      expect(concludeModule.concludeThinkDocument).toHaveBeenCalledWith(
        expect.objectContaining({ conclusion: 'Final decision made' })
      );
    });

    it('passes promote flag', async () => {
      vi.spyOn(concludeModule, 'concludeThinkDocument').mockResolvedValue({
        status: 'success',
        promoted: 'decision-123',
      } as any);

      const args: ParsedArgs = {
        positional: ['conclude', 'Decided X'],
        flags: { promote: 'decision' },
      };
      await cmdThink(args);

      expect(concludeModule.concludeThinkDocument).toHaveBeenCalledWith(
        expect.objectContaining({ promote: 'decision' })
      );
    });
  });

  describe('think delete', () => {
    it('returns error when document ID missing', async () => {
      const args: ParsedArgs = { positional: ['delete'], flags: {} };
      const result = await cmdThink(args);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Missing required argument: document ID');
    });

    it('calls deleteThinkDocument', async () => {
      vi.spyOn(documentModule, 'deleteThinkDocument').mockResolvedValue({
        status: 'success',
        deleted: true,
      } as any);

      const args: ParsedArgs = { positional: ['delete', 'think-789'], flags: {} };
      const result = await cmdThink(args);

      expect(result.status).toBe('success');
      expect(documentModule.deleteThinkDocument).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: 'think-789' })
      );
    });
  });
});
