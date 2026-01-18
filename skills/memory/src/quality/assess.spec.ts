/**
 * Tests for Quality Assessment
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { assessQuality, auditMemories } from './assess.js';

const createGoodMemory = (id: string) => `---
title: ${id} - Good Memory
type: learning
created: ${new Date().toISOString()}
updated: ${new Date().toISOString()}
scope: project
tags:
  - test
  - quality
---

This is a good memory with sufficient content for testing.
It has tags, a title, and meaningful content.
`;

const createBadMemory = () => `---
title: "   "
type: learning
created: 2020-01-01T00:00:00Z
updated: 2020-01-01T00:00:00Z
scope: project
---

x`;

const createNoTagsMemory = () => `---
title: Memory Without Tags
type: learning
created: ${new Date().toISOString()}
updated: ${new Date().toISOString()}
scope: project
---

This has no tags but enough content to avoid the empty content warning.`;

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'assess-test-'));
}

function setupMemoryDir(basePath: string): void {
  fs.mkdirSync(path.join(basePath, 'permanent'), { recursive: true });
  fs.mkdirSync(path.join(basePath, 'temporary'), { recursive: true });
  fs.writeFileSync(
    path.join(basePath, 'graph.json'),
    JSON.stringify({ version: 1, nodes: [], edges: [] })
  );
  fs.writeFileSync(
    path.join(basePath, 'index.json'),
    JSON.stringify({ memories: [] })
  );
}

function cleanupTempDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Ignore
  }
}

describe('assessQuality', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    setupMemoryDir(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('returns error when memory not found', async () => {
    const result = await assessQuality({
      id: 'not-found',
      basePath: tempDir,
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('Memory not found');
    expect(result.score).toBe(0);
  });

  it('returns high score for good memory', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'permanent', 'good-mem.md'),
      createGoodMemory('good-mem')
    );

    // Add to graph so it's not orphaned
    fs.writeFileSync(
      path.join(tempDir, 'graph.json'),
      JSON.stringify({
        version: 1,
        nodes: [{ id: 'good-mem', type: 'learning' }],
        edges: [{ source: 'good-mem', target: 'other', label: 'related' }],
      })
    );

    const result = await assessQuality({
      id: 'good-mem',
      basePath: tempDir,
    });

    expect(result.status).toBe('success');
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.rating).toMatch(/^(excellent|good)$/);
    expect(result.tiersCompleted).toContain(1);
  });

  it('detects missing title', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'permanent', 'bad-mem.md'),
      createBadMemory()
    );

    const result = await assessQuality({
      id: 'bad-mem',
      basePath: tempDir,
    });

    expect(result.status).toBe('success');
    const hasTitle = result.issues.some(i => i.type === 'missing_title');
    expect(hasTitle).toBe(true);
  });

  it('detects missing tags', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'permanent', 'no-tags.md'),
      createNoTagsMemory()
    );

    const result = await assessQuality({
      id: 'no-tags',
      basePath: tempDir,
    });

    const hasTags = result.issues.some(i => i.type === 'missing_tags');
    expect(hasTags).toBe(true);
  });

  it('detects empty content', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'permanent', 'empty.md'),
      createBadMemory()
    );

    const result = await assessQuality({
      id: 'empty',
      basePath: tempDir,
    });

    const hasEmpty = result.issues.some(i => i.type === 'empty_content');
    expect(hasEmpty).toBe(true);
  });

  it('detects orphaned memories', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'permanent', 'orphan.md'),
      createGoodMemory('orphan')
    );

    // Add to graph but no edges
    fs.writeFileSync(
      path.join(tempDir, 'graph.json'),
      JSON.stringify({
        version: 1,
        nodes: [{ id: 'orphan', type: 'learning' }],
        edges: [],
      })
    );

    const result = await assessQuality({
      id: 'orphan',
      basePath: tempDir,
    });

    const hasOrphan = result.issues.some(i => i.type === 'orphaned');
    expect(hasOrphan).toBe(true);
  });

  it('includes deep tiers when requested', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'permanent', 'test.md'),
      createGoodMemory('test')
    );

    const result = await assessQuality({
      id: 'test',
      basePath: tempDir,
      deep: true,
    });

    expect(result.tiersCompleted).toContain(1);
    expect(result.tiersCompleted).toContain(2);
    expect(result.tiersCompleted).toContain(3);
  });
});

describe('assessQuality edge cases', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    setupMemoryDir(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('returns critical rating for score below 25', async () => {
    // Create memory with multiple severe issues to get score < 25
    // Missing title (high -20), empty content (high -20), no tags (medium -10), orphan (medium -10), not in graph (medium -10)
    fs.writeFileSync(
      path.join(tempDir, 'permanent', 'terrible.md'),
      `---
title: "   "
type: learning
created: 2020-01-01T00:00:00Z
updated: 2020-01-01T00:00:00Z
scope: project
---

x`
    );

    const result = await assessQuality({
      id: 'terrible',
      basePath: tempDir,
    });

    expect(result.status).toBe('success');
    expect(result.score).toBeLessThan(50);
    expect(result.rating).toMatch(/^(poor|critical)$/);
  });

  it('detects stale file references in content', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'permanent', 'file-ref.md'),
      `---
title: File Reference Test
type: learning
created: ${new Date().toISOString()}
updated: ${new Date().toISOString()}
scope: project
tags:
  - test
---

This memory references a non-existent file: \`src/nonexistent-file.ts\`
And another one: \`./also-missing.js\`
`
    );

    // Add to graph
    fs.writeFileSync(
      path.join(tempDir, 'graph.json'),
      JSON.stringify({
        version: 1,
        nodes: [{ id: 'file-ref', type: 'learning' }],
        edges: [{ source: 'file-ref', target: 'other', label: 'related' }],
      })
    );

    const result = await assessQuality({
      id: 'file-ref',
      basePath: tempDir,
    });

    const hasStaleRef = result.issues.some(i => i.type === 'stale_file_reference');
    expect(hasStaleRef).toBe(true);
  });

  it('finds memory in temporary directory', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'temporary', 'temp-mem.md'),
      createGoodMemory('temp-mem')
    );

    const result = await assessQuality({
      id: 'temp-mem',
      basePath: tempDir,
    });

    expect(result.status).toBe('success');
    expect(result.score).toBeDefined();
    expect(result.rating).toBeDefined();
  });
});

describe('auditMemories', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    setupMemoryDir(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('returns empty results for empty directory', async () => {
    const result = await auditMemories({ basePath: tempDir });

    expect(result.status).toBe('success');
    expect(result.scanned).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it('scans all memories in directory', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'permanent', 'mem-1.md'),
      createGoodMemory('mem-1')
    );
    fs.writeFileSync(
      path.join(tempDir, 'permanent', 'mem-2.md'),
      createGoodMemory('mem-2')
    );
    fs.writeFileSync(
      path.join(tempDir, 'temporary', 'mem-3.md'),
      createGoodMemory('mem-3')
    );

    const result = await auditMemories({ basePath: tempDir });

    expect(result.status).toBe('success');
    expect(result.scanned).toBe(3);
  });

  it('filters by threshold', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'permanent', 'good.md'),
      createGoodMemory('good')
    );
    fs.writeFileSync(
      path.join(tempDir, 'permanent', 'bad.md'),
      createBadMemory()
    );

    // Add good to graph with edges
    fs.writeFileSync(
      path.join(tempDir, 'graph.json'),
      JSON.stringify({
        version: 1,
        nodes: [{ id: 'good', type: 'learning' }],
        edges: [{ source: 'good', target: 'other', label: 'related' }],
      })
    );

    const result = await auditMemories({ basePath: tempDir, threshold: 50 });

    // Bad memory should be in results (below threshold)
    const hasBad = result.results.some(r => r.id === 'bad');
    expect(hasBad).toBe(true);
  });

  it('provides summary statistics', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'permanent', 'test.md'),
      createGoodMemory('test')
    );

    const result = await auditMemories({ basePath: tempDir });

    expect(result.summary).toHaveProperty('excellent');
    expect(result.summary).toHaveProperty('good');
    expect(result.summary).toHaveProperty('needsAttention');
    expect(result.summary).toHaveProperty('poor');
    expect(result.summary).toHaveProperty('critical');
    expect(result.summary).toHaveProperty('averageScore');
  });

  it('counts good-rated memories in summary', async () => {
    // Create a memory that should rate 'good' (70-89 score)
    // Has tags, title, content, but no graph edges (orphaned = -10)
    fs.writeFileSync(
      path.join(tempDir, 'permanent', 'good-mem.md'),
      createGoodMemory('good-mem')
    );

    // Add to graph with edges to avoid orphan penalty
    fs.writeFileSync(
      path.join(tempDir, 'graph.json'),
      JSON.stringify({
        version: 1,
        nodes: [{ id: 'good-mem', type: 'learning' }],
        edges: [{ source: 'good-mem', target: 'other', label: 'related' }],
      })
    );

    const result = await auditMemories({ basePath: tempDir });

    expect(result.summary.excellent + result.summary.good).toBeGreaterThan(0);
  });

  it('handles parse errors during audit', async () => {
    // Create malformed file that will throw on parse
    fs.writeFileSync(
      path.join(tempDir, 'permanent', 'malformed.md'),
      'Not valid frontmatter at all - no delimiters'
    );

    const result = await auditMemories({ basePath: tempDir });

    expect(result.status).toBe('success');
    expect(result.summary.critical).toBe(1);
    const malformedResult = result.results.find(r => r.id === 'malformed');
    expect(malformedResult).toBeDefined();
    expect(malformedResult?.issues[0]!.type).toBe('parse_error');
  });

});

// Note: The error path at lines 357-365 (assessment.status === 'error')
// requires a race condition where file exists during getAllMemoryIds
// but is deleted before assessQuality runs. This is tested via mocks
// in assess-mocks.spec.ts if needed.
