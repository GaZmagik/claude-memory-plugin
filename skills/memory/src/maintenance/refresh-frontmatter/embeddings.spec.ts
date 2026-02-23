/**
 * Tests for loadEmbeddingsCache and saveEmbeddingsCache
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { loadEmbeddingsCache, saveEmbeddingsCache } from './embeddings.js';

describe('loadEmbeddingsCache', () => {
  it('should return empty cache when file does not exist', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'embeddings-test-'));
    try {
      const result = loadEmbeddingsCache(tmpDir);
      expect(result).toEqual({ version: 1, memories: {} });
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('should return empty cache when file is malformed JSON', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'embeddings-test-'));
    try {
      fs.writeFileSync(path.join(tmpDir, 'embeddings.json'), 'not json');
      const result = loadEmbeddingsCache(tmpDir);
      expect(result).toEqual({ version: 1, memories: {} });
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('should add missing memories property when cache lacks it', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'embeddings-test-'));
    try {
      fs.writeFileSync(path.join(tmpDir, 'embeddings.json'), JSON.stringify({ version: 1 }));
      const result = loadEmbeddingsCache(tmpDir);
      expect(result.memories).toBeDefined();
      expect(result.memories).toEqual({});
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('should load a valid cache file correctly', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'embeddings-test-'));
    try {
      const cache = {
        version: 1,
        memories: {
          'decision-test': {
            embedding: [0.1, 0.2],
            hash: 'abc123',
            timestamp: '2026-01-01T00:00:00Z',
          },
        },
      };
      fs.writeFileSync(path.join(tmpDir, 'embeddings.json'), JSON.stringify(cache));
      const result = loadEmbeddingsCache(tmpDir);
      expect(result).toEqual(cache);
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });
});

describe('saveEmbeddingsCache', () => {
  it('should write cache to disk', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'embeddings-test-'));
    try {
      const cache = {
        version: 1,
        memories: {
          'test-id': { embedding: [], hash: 'abc', timestamp: '2026-01-01T00:00:00Z' },
        },
      };
      saveEmbeddingsCache(tmpDir, cache);
      const written = JSON.parse(
        fs.readFileSync(path.join(tmpDir, 'embeddings.json'), 'utf-8')
      );
      expect(written).toEqual(cache);
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('should overwrite an existing cache file', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'embeddings-test-'));
    try {
      const oldCache = { version: 1, memories: { old: { embedding: [], hash: 'old', timestamp: '2026-01-01T00:00:00Z' } } };
      fs.writeFileSync(path.join(tmpDir, 'embeddings.json'), JSON.stringify(oldCache));

      const newCache = { version: 1, memories: { new: { embedding: [1, 2], hash: 'new', timestamp: '2026-02-01T00:00:00Z' } } };
      saveEmbeddingsCache(tmpDir, newCache);

      const written = JSON.parse(
        fs.readFileSync(path.join(tmpDir, 'embeddings.json'), 'utf-8')
      );
      expect(written).toEqual(newCache);
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });
});
