/**
 * Tests for think-migration helpers
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  migrateThinkId,
  migrateThoughtJsonState,
  migrateGraphJson,
  migrateIndexJson,
} from './think-migration.js';

describe('migrateThinkId', () => {
  it('should rename think- prefix to thought-', () => {
    expect(migrateThinkId('think-20260101-120000')).toBe('thought-20260101-120000');
  });

  it('should leave non-think IDs unchanged', () => {
    expect(migrateThinkId('decision-something')).toBe('decision-something');
  });

  it('should leave thought- prefixed IDs unchanged', () => {
    expect(migrateThinkId('thought-20260101-120000')).toBe('thought-20260101-120000');
  });

  it('should handle think- with no suffix', () => {
    expect(migrateThinkId('think-')).toBe('thought-');
  });
});

describe('migrateThoughtJsonState', () => {
  it('should return false when thought.json does not exist', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'think-mig-test-'));
    try {
      const result = migrateThoughtJsonState(tmpDir, 'think-123', 'thought-123', false);
      expect(result).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('should update currentDocumentId when it matches oldId', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'think-mig-test-'));
    try {
      const statePath = path.join(tmpDir, 'thought.json');
      fs.writeFileSync(statePath, JSON.stringify({ currentDocumentId: 'think-123' }));

      const result = migrateThoughtJsonState(tmpDir, 'think-123', 'thought-123', false);
      expect(result).toBe(true);

      const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(state.currentDocumentId).toBe('thought-123');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('should return true but not write when dryRun is true', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'think-mig-test-'));
    try {
      const statePath = path.join(tmpDir, 'thought.json');
      fs.writeFileSync(statePath, JSON.stringify({ currentDocumentId: 'think-123' }));

      const result = migrateThoughtJsonState(tmpDir, 'think-123', 'thought-123', true);
      expect(result).toBe(true);

      // File should be unchanged in dry run
      const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(state.currentDocumentId).toBe('think-123');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('should return false when currentDocumentId does not match oldId', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'think-mig-test-'));
    try {
      const statePath = path.join(tmpDir, 'thought.json');
      fs.writeFileSync(statePath, JSON.stringify({ currentDocumentId: 'other-thought-id' }));

      const result = migrateThoughtJsonState(tmpDir, 'think-123', 'thought-123', false);
      expect(result).toBe(false);

      // File should be unchanged
      const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(state.currentDocumentId).toBe('other-thought-id');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('should handle malformed thought.json gracefully', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'think-mig-test-'));
    try {
      const statePath = path.join(tmpDir, 'thought.json');
      fs.writeFileSync(statePath, 'not valid json');

      const result = migrateThoughtJsonState(tmpDir, 'think-123', 'thought-123', false);
      expect(result).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });
});

describe('migrateGraphJson', () => {
  it('should return false when graph.json does not exist', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'think-mig-test-'));
    try {
      const result = migrateGraphJson(tmpDir, 'think-123', 'thought-123', false);
      expect(result).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('should return false when graph.json does not contain the old ID', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'think-mig-test-'));
    try {
      const graphPath = path.join(tmpDir, 'graph.json');
      fs.writeFileSync(
        graphPath,
        JSON.stringify({ nodes: [{ id: 'other-node', type: 'decision' }], edges: [] })
      );

      const result = migrateGraphJson(tmpDir, 'think-123', 'thought-123', false);
      expect(result).toBe(false);

      // Graph should be unchanged
      const graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
      expect(graph.nodes[0].id).toBe('other-node');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('should replace old ID with new ID in graph.json', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'think-mig-test-'));
    try {
      const graphPath = path.join(tmpDir, 'graph.json');
      fs.writeFileSync(
        graphPath,
        JSON.stringify({ nodes: [{ id: 'think-123', type: 'think' }], edges: [] })
      );

      const result = migrateGraphJson(tmpDir, 'think-123', 'thought-123', false);
      expect(result).toBe(true);

      const graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
      expect(graph.nodes[0].id).toBe('thought-123');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('should return true but not write when dryRun is true', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'think-mig-test-'));
    try {
      const graphPath = path.join(tmpDir, 'graph.json');
      fs.writeFileSync(
        graphPath,
        JSON.stringify({ nodes: [{ id: 'think-123', type: 'think' }], edges: [] })
      );

      const result = migrateGraphJson(tmpDir, 'think-123', 'thought-123', true);
      expect(result).toBe(true);

      // File should be unchanged
      const graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
      expect(graph.nodes[0].id).toBe('think-123');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('should handle malformed graph.json gracefully', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'think-mig-test-'));
    try {
      const graphPath = path.join(tmpDir, 'graph.json');
      fs.writeFileSync(graphPath, '{ invalid json }');

      const result = migrateGraphJson(tmpDir, 'think-123', 'thought-123', false);
      expect(result).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });
});

describe('migrateIndexJson', () => {
  it('should return false when index.json does not exist', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'think-mig-test-'));
    try {
      const result = migrateIndexJson(tmpDir, 'think-123', 'thought-123', false);
      expect(result).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('should return false when index.json does not contain the old ID', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'think-mig-test-'));
    try {
      const indexPath = path.join(tmpDir, 'index.json');
      fs.writeFileSync(
        indexPath,
        JSON.stringify({ memories: [{ id: 'other-memory', relativePath: 'permanent/other.md' }] })
      );

      const result = migrateIndexJson(tmpDir, 'think-123', 'thought-123', false);
      expect(result).toBe(false);

      // Index should be unchanged
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      expect(index.memories[0].id).toBe('other-memory');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('should replace old ID and paths in index.json', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'think-mig-test-'));
    try {
      const indexPath = path.join(tmpDir, 'index.json');
      fs.writeFileSync(
        indexPath,
        JSON.stringify({
          memories: [{
            id: 'think-123',
            relativePath: 'temporary/think-123.md',
          }],
        })
      );

      const result = migrateIndexJson(tmpDir, 'think-123', 'thought-123', false);
      expect(result).toBe(true);

      const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      expect(index.memories[0].id).toBe('thought-123');
      expect(index.memories[0].relativePath).toBe('temporary/thought-123.md');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('should return true but not write when dryRun is true', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'think-mig-test-'));
    try {
      const indexPath = path.join(tmpDir, 'index.json');
      fs.writeFileSync(
        indexPath,
        JSON.stringify({
          memories: [{ id: 'think-123', relativePath: 'temporary/think-123.md' }],
        })
      );

      const result = migrateIndexJson(tmpDir, 'think-123', 'thought-123', true);
      expect(result).toBe(true);

      // File should be unchanged
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      expect(index.memories[0].id).toBe('think-123');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('should handle malformed index.json gracefully', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'think-mig-test-'));
    try {
      const indexPath = path.join(tmpDir, 'index.json');
      fs.writeFileSync(indexPath, '{ broken: }');

      const result = migrateIndexJson(tmpDir, 'think-123', 'thought-123', false);
      expect(result).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });
});
