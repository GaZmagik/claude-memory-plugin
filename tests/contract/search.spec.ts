/**
 * T019: Contract test for SearchMemoriesRequest/Response
 *
 * Tests the keyword search operation contract.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { searchMemories } from '../../skills/memory/src/core/search.js';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { MemoryType, Scope } from '../../skills/memory/src/types/enums.js';
import type { SearchMemoriesRequest } from '../../skills/memory/src/types/api.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

describe('searchMemories contract', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'memory-search-test-'));

    // Create test memories for searching
    await writeMemory({
      title: 'OAuth2 Authentication Decision',
      type: MemoryType.Decision,
      content: 'We decided to use OAuth2 for secure token-based authentication.',
      tags: ['auth', 'security', 'oauth'],
      scope: Scope.Global,
      basePath: testDir,
    });

    await writeMemory({
      title: 'Database Connection Pooling',
      type: MemoryType.Decision,
      content: 'Using connection pooling for better database performance.',
      tags: ['database', 'performance'],
      scope: Scope.Global,
      basePath: testDir,
    });

    await writeMemory({
      title: 'Token Refresh Pattern',
      type: MemoryType.Artifact,
      content: 'Pattern for refreshing OAuth tokens before expiry.',
      tags: ['auth', 'pattern'],
      scope: Scope.Global,
      basePath: testDir,
    });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should find memories by title keyword', async () => {
    const request: SearchMemoriesRequest = {
      query: 'OAuth',
      basePath: testDir,
    };

    const response = await searchMemories(request);

    expect(response.status).toBe('success');
    expect(response.results?.length).toBeGreaterThanOrEqual(1);
    expect(response.results?.some(r => r.title.includes('OAuth'))).toBe(true);
  });

  it('should find memories by content keyword', async () => {
    const request: SearchMemoriesRequest = {
      query: 'token-based',
      basePath: testDir,
    };

    const response = await searchMemories(request);

    expect(response.status).toBe('success');
    expect(response.results?.length).toBeGreaterThanOrEqual(1);
  });

  it('should be case-insensitive', async () => {
    const request: SearchMemoriesRequest = {
      query: 'oauth',
      basePath: testDir,
    };

    const response = await searchMemories(request);

    expect(response.status).toBe('success');
    expect(response.results?.length).toBeGreaterThanOrEqual(1);
  });

  it('should return empty results for no matches', async () => {
    const request: SearchMemoriesRequest = {
      query: 'nonexistent-term-xyz',
      basePath: testDir,
    };

    const response = await searchMemories(request);

    expect(response.status).toBe('success');
    expect(response.results).toHaveLength(0);
  });

  it('should filter by type', async () => {
    const request: SearchMemoriesRequest = {
      query: 'OAuth',
      basePath: testDir,
      type: MemoryType.Decision,
    };

    const response = await searchMemories(request);

    expect(response.status).toBe('success');
    expect(response.results?.every(r => r.type === MemoryType.Decision)).toBe(true);
  });

  it('should limit results', async () => {
    const request: SearchMemoriesRequest = {
      query: 'a', // Matches multiple
      basePath: testDir,
      limit: 1,
    };

    const response = await searchMemories(request);

    expect(response.status).toBe('success');
    expect(response.results?.length).toBeLessThanOrEqual(1);
  });

  it('should return error for empty query', async () => {
    const request: SearchMemoriesRequest = {
      query: '',
      basePath: testDir,
    };

    const response = await searchMemories(request);

    expect(response.status).toBe('error');
    expect(response.error).toContain('query');
  });

  it('should search in tags', async () => {
    const request: SearchMemoriesRequest = {
      query: 'security',
      basePath: testDir,
    };

    const response = await searchMemories(request);

    expect(response.status).toBe('success');
    expect(response.results?.some(r => r.tags.includes('security'))).toBe(true);
  });

  it('should rank by relevance', async () => {
    const request: SearchMemoriesRequest = {
      query: 'authentication',
      basePath: testDir,
    };

    const response = await searchMemories(request);

    expect(response.status).toBe('success');
    // Memory with 'authentication' in title should rank higher
    if (response.results && response.results.length > 1) {
      expect(response.results[0].title).toContain('Authentication');
    }
  });
});
