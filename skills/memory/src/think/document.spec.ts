/**
 * Tests for Think Document CRUD Operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  getTemporaryDir,
  getThinkFilePath,
  createThinkDocument,
  listThinkDocuments,
  showThinkDocument,
  deleteThinkDocument,
  thinkDocumentExists,
  readThinkDocumentRaw,
} from './document.js';
import { Scope, ThinkStatus } from '../types/enums.js';

describe('think/document', () => {
  let tempDir: string;
  let projectMemoryDir: string;
  let localMemoryDir: string;
  let globalMemoryDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'think-document-'));
    projectMemoryDir = path.join(tempDir, 'project', '.claude', 'memory');
    localMemoryDir = path.join(tempDir, 'project', '.claude', 'memory', 'local');
    globalMemoryDir = path.join(tempDir, 'global', '.claude', 'memory');

    fs.mkdirSync(projectMemoryDir, { recursive: true });
    fs.mkdirSync(localMemoryDir, { recursive: true });
    fs.mkdirSync(globalMemoryDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getTemporaryDir', () => {
    it('returns temporary subdirectory path', () => {
      const result = getTemporaryDir('/base/path');
      expect(result).toBe('/base/path/temporary');
    });
  });

  describe('getThinkFilePath', () => {
    it('returns path to think document file', () => {
      const result = getThinkFilePath('/base/path', 'think-20260112-100000');
      expect(result).toBe('/base/path/temporary/think-20260112-100000.md');
    });
  });

  describe('createThinkDocument', () => {
    it('creates a new think document', async () => {
      const result = await createThinkDocument({
        topic: 'Test deliberation',
        basePath: path.join(tempDir, 'project'),
      });

      expect(result.status).toBe('success');
      expect(result.document).toBeDefined();
      expect(result.document?.topic).toBe('Test deliberation');
      expect(result.document?.id).toMatch(/^think-\d{8}-\d{6,9}$/);
    });

    it('creates document file on disk', async () => {
      const result = await createThinkDocument({
        topic: 'Test topic',
        basePath: path.join(tempDir, 'project'),
      });

      expect(result.document?.filePath).toBeDefined();
      expect(fs.existsSync(result.document!.filePath)).toBe(true);
    });

    it('defaults to Project scope', async () => {
      const result = await createThinkDocument({
        topic: 'Test',
        basePath: path.join(tempDir, 'project'),
      });

      expect(result.document?.scope).toBe(Scope.Project);
    });

    it('supports Local scope', async () => {
      const result = await createThinkDocument({
        topic: 'Private thoughts',
        scope: Scope.Local,
        basePath: path.join(tempDir, 'project'),
      });

      expect(result.status).toBe('success');
      expect(result.document?.scope).toBe(Scope.Local);
    });

    it('rejects invalid scope', async () => {
      const result = await createThinkDocument({
        topic: 'Test',
        scope: Scope.Global,
        basePath: path.join(tempDir, 'project'),
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('scope');
    });

    it('rejects empty topic', async () => {
      const result = await createThinkDocument({
        topic: '',
        basePath: path.join(tempDir, 'project'),
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('topic');
    });
  });

  describe('listThinkDocuments', () => {
    it('returns empty array when no documents', async () => {
      const result = await listThinkDocuments({
        basePath: path.join(tempDir, 'project'),
      });

      expect(result.status).toBe('success');
      expect(result.documents).toHaveLength(0);
    });

    it('lists created documents', async () => {
      await createThinkDocument({
        topic: 'First topic',
        basePath: path.join(tempDir, 'project'),
      });
      // Wait to avoid ID collision (IDs are per-second)
      await new Promise(r => setTimeout(r, 1100));
      await createThinkDocument({
        topic: 'Second topic',
        basePath: path.join(tempDir, 'project'),
      });

      const result = await listThinkDocuments({
        basePath: path.join(tempDir, 'project'),
      });

      expect(result.status).toBe('success');
      expect(result.documents?.length).toBeGreaterThanOrEqual(2);
    });

    it('filters by status', async () => {
      await createThinkDocument({
        topic: 'Active topic',
        basePath: path.join(tempDir, 'project'),
      });

      const result = await listThinkDocuments({
        basePath: path.join(tempDir, 'project'),
        status: ThinkStatus.Active,
      });

      expect(result.status).toBe('success');
      expect(result.documents?.every(d => d.status === ThinkStatus.Active)).toBe(true);
    });

    it('includes thought count', async () => {
      await createThinkDocument({
        topic: 'Test topic',
        basePath: path.join(tempDir, 'project'),
      });

      const result = await listThinkDocuments({
        basePath: path.join(tempDir, 'project'),
      });

      expect(result.documents?.[0].thoughtCount).toBeDefined();
    });
  });

  describe('showThinkDocument', () => {
    it('shows document by ID', async () => {
      const created = await createThinkDocument({
        topic: 'Show me',
        basePath: path.join(tempDir, 'project'),
      });

      const result = await showThinkDocument({
        documentId: created.document!.id,
        basePath: path.join(tempDir, 'project'),
      });

      expect(result.status).toBe('success');
      expect(result.document?.frontmatter.topic).toBe('Show me');
    });

    it('shows current document when no ID specified', async () => {
      await createThinkDocument({
        topic: 'Current topic',
        basePath: path.join(tempDir, 'project'),
      });

      const result = await showThinkDocument({
        basePath: path.join(tempDir, 'project'),
      });

      expect(result.status).toBe('success');
      expect(result.document?.frontmatter.topic).toBe('Current topic');
    });

    it('returns error for non-existent document', async () => {
      const result = await showThinkDocument({
        documentId: 'think-00000000-000000',
        basePath: path.join(tempDir, 'project'),
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('not found');
    });

    it('returns error when no current document', async () => {
      const result = await showThinkDocument({
        basePath: path.join(tempDir, 'project'),
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('no current document');
    });
  });

  describe('deleteThinkDocument', () => {
    it('deletes document by ID', async () => {
      const created = await createThinkDocument({
        topic: 'Delete me',
        basePath: path.join(tempDir, 'project'),
      });

      const result = await deleteThinkDocument({
        documentId: created.document!.id,
        basePath: path.join(tempDir, 'project'),
      });

      expect(result.status).toBe('success');
      expect(result.deletedId).toBe(created.document!.id);
      expect(fs.existsSync(created.document!.filePath)).toBe(false);
    });

    it('returns error for non-existent document', async () => {
      const result = await deleteThinkDocument({
        documentId: 'think-00000000-000000',
        basePath: path.join(tempDir, 'project'),
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('not found');
    });

    it('rejects invalid document ID format', async () => {
      const result = await deleteThinkDocument({
        documentId: 'invalid-id',
        basePath: path.join(tempDir, 'project'),
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('documentId');
    });
  });

  describe('thinkDocumentExists', () => {
    it('returns exists: true for existing document', async () => {
      const created = await createThinkDocument({
        topic: 'Exists',
        basePath: path.join(tempDir, 'project'),
      });

      const result = thinkDocumentExists(
        created.document!.id,
        path.join(tempDir, 'project'),
        globalMemoryDir
      );

      expect(result.exists).toBe(true);
      expect(result.scope).toBeDefined();
      expect(result.filePath).toBeDefined();
    });

    it('returns exists: false for non-existent document', () => {
      const result = thinkDocumentExists(
        'think-00000000-000000',
        path.join(tempDir, 'project'),
        globalMemoryDir
      );

      expect(result.exists).toBe(false);
      expect(result.scope).toBeUndefined();
    });
  });

  describe('readThinkDocumentRaw', () => {
    it('reads raw document content', async () => {
      const created = await createThinkDocument({
        topic: 'Raw content',
        basePath: path.join(tempDir, 'project'),
      });

      const result = readThinkDocumentRaw(
        created.document!.id,
        path.join(tempDir, 'project'),
        globalMemoryDir
      );

      expect(result).not.toBeNull();
      expect(result?.content).toContain('Raw content');
      expect(result?.scope).toBeDefined();
    });

    it('returns null for non-existent document', () => {
      const result = readThinkDocumentRaw(
        'think-00000000-000000',
        path.join(tempDir, 'project'),
        globalMemoryDir
      );

      expect(result).toBeNull();
    });
  });
});
