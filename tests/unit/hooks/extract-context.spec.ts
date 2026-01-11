/**
 * Tests for session context extraction
 */

import { describe, it, expect } from 'vitest';

describe('extract-context', () => {
  describe('cwdToProjectPath', () => {
    it('should convert cwd to project path format', async () => {
      const { cwdToProjectPath } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      expect(cwdToProjectPath('/home/user/project')).toBe('-home-user-project');
      expect(cwdToProjectPath('/home/gareth/.vs/claude-memory-plugin')).toBe(
        '-home-gareth--vs-claude-memory-plugin'
      );
    });

    it('should handle root path', async () => {
      const { cwdToProjectPath } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      expect(cwdToProjectPath('/')).toBe('-');
    });
  });

  describe('findSessionJsonl', () => {
    it('should return null if JSONL file not found', async () => {
      const { findSessionJsonl } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const result = findSessionJsonl('nonexistent-session', '/fake/path');
      expect(result).toBeNull();
    });
  });

  describe('extractSessionContext', () => {
    it('should return null if JSONL file not found', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const result = extractSessionContext('nonexistent-session', '/fake/path');
      expect(result).toBeNull();
    });
  });

  describe('extractContextAsSystemPrompt', () => {
    it('should return null if no session context', async () => {
      const { extractContextAsSystemPrompt } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const result = extractContextAsSystemPrompt('nonexistent', '/fake/path');
      expect(result).toBeNull();
    });
  });
});
