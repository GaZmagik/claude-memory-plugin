/**
 * Tests for Think State Management
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  getStatePath,
  loadState,
  saveState,
  getCurrentDocumentId,
  getCurrentScope,
  setCurrentDocument,
  clearCurrentDocument,
  isCurrentDocument,
} from './state.js';
import { Scope } from '../types/enums.js';
import { thinkId } from '../test-utils/branded-helpers.js';

describe('think/state', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'think-state-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getStatePath', () => {
    it('returns path to thought.json file', () => {
      const result = getStatePath('/some/path');
      expect(result).toBe('/some/path/thought.json');
    });
  });

  describe('loadState', () => {
    it('returns empty state when file does not exist', async () => {
      const state = await loadState(tempDir);
      expect(state.currentDocumentId).toBeNull();
      expect(state.currentScope).toBeNull();
      expect(state.lastUpdated).toBeDefined();
    });

    it('loads existing state from file', async () => {
      const stateFile = path.join(tempDir, 'thought.json');
      fs.writeFileSync(stateFile, JSON.stringify({
        currentDocumentId: thinkId('think-20260112-100000'),
        currentScope: Scope.Project,
        lastUpdated: '2026-01-12T10:00:00Z',
      }));

      const state = await loadState(tempDir);
      expect(state.currentDocumentId).toBe(thinkId('think-20260112-100000'));
      expect(state.currentScope).toBe(Scope.Project);
    });

    it('returns empty state on invalid JSON', async () => {
      const stateFile = path.join(tempDir, 'thought.json');
      fs.writeFileSync(stateFile, 'not valid json');

      const state = await loadState(tempDir);
      expect(state.currentDocumentId).toBeNull();
    });
  });

  describe('saveState', () => {
    it('creates state file', async () => {
      await saveState(tempDir, {
        currentDocumentId: thinkId('think-20260112-100000'),
        currentScope: Scope.Local,
        lastUpdated: '2026-01-12T10:00:00Z',
      });

      const stateFile = path.join(tempDir, 'thought.json');
      expect(fs.existsSync(stateFile)).toBe(true);

      const content = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      expect(content.currentDocumentId).toBe(thinkId('think-20260112-100000'));
      expect(content.currentScope).toBe(Scope.Local);
    });

    it('creates directory if needed', async () => {
      const nestedDir = path.join(tempDir, 'nested', 'path');
      await saveState(nestedDir, {
        currentDocumentId: thinkId('think-20260112-100000'),
        currentScope: Scope.Project,
        lastUpdated: '2026-01-12T10:00:00Z',
      });

      expect(fs.existsSync(path.join(nestedDir, 'thought.json'))).toBe(true);
    });

    it('updates lastUpdated timestamp', async () => {
      const before = new Date().toISOString();
      await saveState(tempDir, {
        currentDocumentId: thinkId('think-20260112-100000'),
        currentScope: Scope.Project,
        lastUpdated: '2020-01-01T00:00:00Z', // Old timestamp
      });
      const after = new Date().toISOString();

      const content = JSON.parse(fs.readFileSync(
        path.join(tempDir, 'thought.json'),
        'utf-8'
      ));
      expect(content.lastUpdated >= before).toBe(true);
      expect(content.lastUpdated <= after).toBe(true);
    });
  });

  describe('getCurrentDocumentId', () => {
    it('returns null when no state', async () => {
      expect(await getCurrentDocumentId(tempDir)).toBeNull();
    });

    it('returns current document ID', async () => {
      await saveState(tempDir, {
        currentDocumentId: thinkId('think-20260112-100000'),
        currentScope: Scope.Project,
        lastUpdated: new Date().toISOString(),
      });

      expect(await getCurrentDocumentId(tempDir)).toBe(thinkId('think-20260112-100000'));
    });
  });

  describe('getCurrentScope', () => {
    it('returns null when no state', async () => {
      expect(await getCurrentScope(tempDir)).toBeNull();
    });

    it('returns current scope', async () => {
      await saveState(tempDir, {
        currentDocumentId: thinkId('think-20260112-100000'),
        currentScope: Scope.Local,
        lastUpdated: new Date().toISOString(),
      });

      expect(await getCurrentScope(tempDir)).toBe(Scope.Local);
    });
  });

  describe('setCurrentDocument', () => {
    it('sets current document and scope', async () => {
      await setCurrentDocument(tempDir, 'think-20260112-100000', Scope.Project);

      const state = await loadState(tempDir);
      expect(state.currentDocumentId).toBe(thinkId('think-20260112-100000'));
      expect(state.currentScope).toBe(Scope.Project);
    });

    it('overwrites previous current document', async () => {
      await setCurrentDocument(tempDir, 'think-20260112-100000', Scope.Project);
      await setCurrentDocument(tempDir, 'think-20260112-110000', Scope.Local);

      const state = await loadState(tempDir);
      expect(state.currentDocumentId).toBe(thinkId('think-20260112-110000'));
      expect(state.currentScope).toBe(Scope.Local);
    });
  });

  describe('clearCurrentDocument', () => {
    it('clears current document', async () => {
      await setCurrentDocument(tempDir, 'think-20260112-100000', Scope.Project);
      await clearCurrentDocument(tempDir);

      const state = await loadState(tempDir);
      expect(state.currentDocumentId).toBeNull();
      expect(state.currentScope).toBeNull();
    });

    it('handles clearing when already empty', async () => {
      await clearCurrentDocument(tempDir);
      const state = await loadState(tempDir);
      expect(state.currentDocumentId).toBeNull();
    });
  });

  describe('isCurrentDocument', () => {
    it('returns false when no current document', async () => {
      expect(await isCurrentDocument(tempDir, 'think-20260112-100000')).toBe(false);
    });

    it('returns true for current document', async () => {
      await setCurrentDocument(tempDir, 'think-20260112-100000', Scope.Project);
      expect(await isCurrentDocument(tempDir, 'think-20260112-100000')).toBe(true);
    });

    it('returns false for different document', async () => {
      await setCurrentDocument(tempDir, 'think-20260112-100000', Scope.Project);
      expect(await isCurrentDocument(tempDir, 'think-20260112-110000')).toBe(false);
    });
  });
});
