/**
 * Mock-based tests for document.ts edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createThinkDocument,
  listThinkDocuments,
  showThinkDocument,
  deleteThinkDocument,
} from './document.js';
import * as fsUtilsModule from '../core/fs-utils.js';
import * as stateModule from './state.js';
import * as frontmatterModule from './frontmatter.js';
import { ThinkStatus, MemoryType, Scope } from '../types/enums.js';

describe('document.ts mocked edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createThinkDocument', () => {
    it('should return error when writeFileAtomic throws', async () => {
      vi.spyOn(fsUtilsModule, 'fileExists').mockReturnValue(false);
      vi.spyOn(fsUtilsModule, 'ensureDir').mockImplementation(() => {});
      vi.spyOn(fsUtilsModule, 'writeFileAtomic').mockImplementation(() => {
        throw new Error('Disk full');
      });

      const result = await createThinkDocument({
        topic: 'Test topic',
        basePath: '/test/path',
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('Failed to create think document');
      expect(result.error).toContain('Disk full');
    });
  });

  describe('listThinkDocuments', () => {
    it('should skip files that fail to parse', async () => {
      // Mock directory listing with one valid file
      vi.spyOn(fsUtilsModule, 'fileExists').mockReturnValue(true);
      vi.spyOn(fsUtilsModule, 'listMarkdownFiles').mockReturnValue(['think-20260101-120000.md']);
      vi.spyOn(fsUtilsModule, 'readFile').mockReturnValue('invalid content');
      vi.spyOn(frontmatterModule, 'parseThinkDocument').mockImplementation(() => {
        throw new Error('Invalid frontmatter');
      });
      vi.spyOn(stateModule, 'loadState').mockReturnValue({
        currentDocumentId: null,
        currentScope: Scope.Project,
        lastUpdated: new Date().toISOString(),
      });

      const result = await listThinkDocuments({
        basePath: '/test/path',
      });

      expect(result.status).toBe('success');
      expect(result.documents).toHaveLength(0); // File was skipped
    });
  });

  describe('showThinkDocument', () => {
    it('should return error when readFile throws', async () => {
      vi.spyOn(stateModule, 'getCurrentDocumentId').mockReturnValue('think-20260101-120000');
      vi.spyOn(fsUtilsModule, 'fileExists').mockReturnValue(true);
      vi.spyOn(fsUtilsModule, 'readFile').mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await showThinkDocument({
        basePath: '/test/path',
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('Failed to read think document');
      expect(result.error).toContain('Permission denied');
    });
  });

  describe('deleteThinkDocument', () => {
    it('should return error when deleteFile throws', async () => {
      vi.spyOn(stateModule, 'getCurrentDocumentId').mockReturnValue('think-20260101-120000');
      vi.spyOn(fsUtilsModule, 'fileExists').mockReturnValue(true);
      vi.spyOn(fsUtilsModule, 'readFile').mockReturnValue(`---
topic: Test
status: active
created: 2026-01-01T12:00:00.000Z
updated: 2026-01-01T12:00:00.000Z
tags: []
---

## Thoughts
`);
      vi.spyOn(frontmatterModule, 'parseThinkDocument').mockReturnValue({
        frontmatter: {
          type: MemoryType.Breadcrumb,
          title: 'Test',
          topic: 'Test',
          status: ThinkStatus.Active,
          created: '2026-01-01T12:00:00.000Z',
          updated: '2026-01-01T12:00:00.000Z',
          tags: [],
          scope: Scope.Project,
        },
        thoughts: [],
        rawContent: '## Thoughts\n',
      });
      vi.spyOn(fsUtilsModule, 'deleteFile').mockImplementation(() => {
        throw new Error('File locked');
      });

      const result = await deleteThinkDocument({
        documentId: 'think-20260101-120000',
        basePath: '/test/path',
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('Failed to delete think document');
      expect(result.error).toContain('File locked');
    });
  });
});
