/**
 * Mock-based tests for conclude.ts edge cases
 * Uses vitest for module mocking capabilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { concludeThinkDocument } from './conclude.js';
import * as documentModule from './document.js';
import * as stateModule from './state.js';
import * as fsUtilsModule from '../core/fs-utils.js';
import * as writeModule from '../core/write.js';
import * as frontmatterModule from './frontmatter.js';
import { ThinkStatus, MemoryType, Scope } from '../types/enums.js';

describe('concludeThinkDocument mocked edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when file is missing after scope lookup', async () => {
    // Document exists check returns true, but actual file read fails
    vi.spyOn(stateModule, 'getCurrentDocumentId').mockReturnValue(null);
    vi.spyOn(documentModule, 'thinkDocumentExists').mockReturnValue({
      exists: true,
      scope: Scope.Project,
    });
    vi.spyOn(fsUtilsModule, 'fileExists').mockReturnValue(false);

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
    vi.spyOn(stateModule, 'getCurrentDocumentId').mockReturnValue('think-20260101-120000');
    vi.spyOn(fsUtilsModule, 'fileExists').mockReturnValue(true);
    vi.spyOn(fsUtilsModule, 'readFile').mockReturnValue(`---
topic: Test Topic
status: active
created: 2026-01-01T12:00:00.000Z
updated: 2026-01-01T12:00:00.000Z
tags: []
---

## Thoughts

Initial thought`);

    vi.spyOn(frontmatterModule, 'parseThinkDocument').mockReturnValue({
      frontmatter: {
        topic: 'Test Topic',
        status: ThinkStatus.Active,
        created: '2026-01-01T12:00:00.000Z',
        updated: '2026-01-01T12:00:00.000Z',
        tags: [],
      } as any,
      thoughts: [],
      rawContent: '## Thoughts\n\nInitial thought',
    });

    vi.spyOn(fsUtilsModule, 'writeFileAtomic').mockImplementation(() => {});
    vi.spyOn(stateModule, 'clearCurrentDocument').mockImplementation(() => {});

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
    vi.spyOn(stateModule, 'getCurrentDocumentId').mockReturnValue('think-20260101-120000');
    vi.spyOn(fsUtilsModule, 'fileExists').mockReturnValue(true);
    vi.spyOn(fsUtilsModule, 'readFile').mockImplementation(() => {
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
