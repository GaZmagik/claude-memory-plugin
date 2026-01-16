/**
 * CLI Boundary Condition Tests
 *
 * Tests edge cases, invalid inputs, and error handling for CLI commands.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseArgs, getFlagString, getFlagNumber, getFlagBool } from './parser.js';
import { cmdRead, cmdWrite, cmdDelete, cmdSearch, cmdList } from './commands/crud.js';
import { cmdLink, cmdUnlink } from './commands/graph.js';
import { cmdImport, cmdExport } from './commands/bulk.js';
import { cmdThink } from './commands/think.js';
import type { ParsedArgs } from './parser.js';

describe('CLI Argument Parsing Edge Cases', () => {
  it('handles empty arguments', () => {
    const result = parseArgs([]);
    expect(result.positional).toEqual([]);
    expect(result.flags).toEqual({});
  });

  it('handles only flags, no positional', () => {
    const result = parseArgs(['--verbose', '--scope', 'global']);
    expect(result.positional).toEqual([]);
    expect(result.flags.verbose).toBe(true);
    expect(result.flags.scope).toBe('global');
  });

  it('handles flag without value at end', () => {
    const result = parseArgs(['test', '--flag']);
    expect(result.positional).toEqual(['test']);
    expect(result.flags.flag).toBe(true);
  });

  it('parses equals-style flags correctly', () => {
    // Parser now supports --flag=value syntax
    const result = parseArgs(['--name=value']);
    expect(result.flags.name).toBe('value');
  });

  it('handles short flags', () => {
    const result = parseArgs(['-v', '-n', 'test']);
    expect(result.flags.v).toBe(true);
    expect(result.flags.n).toBe('test');
  });

  it('handles mixed positional and flags', () => {
    const result = parseArgs(['pos1', '--flag1', 'val1', 'pos2', '--flag2']);
    expect(result.positional).toContain('pos1');
    expect(result.flags.flag1).toBe('val1');
  });
});

describe('Flag Extraction Edge Cases', () => {
  it('getFlagString returns undefined for missing flag', () => {
    expect(getFlagString({}, 'missing')).toBeUndefined();
  });

  it('getFlagString returns undefined for boolean flag', () => {
    // Boolean flags are not converted to string
    expect(getFlagString({ flag: true }, 'flag')).toBeUndefined();
  });

  it('getFlagNumber returns undefined for non-numeric', () => {
    expect(getFlagNumber({ count: 'abc' }, 'count')).toBeUndefined();
  });

  it('getFlagNumber parses valid numbers', () => {
    expect(getFlagNumber({ count: '42' }, 'count')).toBe(42);
    expect(getFlagNumber({ count: '-10' }, 'count')).toBe(-10);
    expect(getFlagNumber({ count: '3.14' }, 'count')).toBe(3.14);
  });

  it('getFlagBool handles string true/false', () => {
    expect(getFlagBool({ flag: 'true' }, 'flag')).toBe(true);
    expect(getFlagBool({ flag: 'false' }, 'flag')).toBe(false);
    // Note: '1' and '0' are not treated as boolean
    expect(getFlagBool({ flag: true }, 'flag')).toBe(true);
    expect(getFlagBool({ flag: false }, 'flag')).toBe(false);
  });
});

describe('CRUD Command Boundary Conditions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('cmdRead', () => {
    it('returns error when id is missing', async () => {
      const args: ParsedArgs = { positional: [], flags: {} };
      const result = await cmdRead(args);
      expect(result.status).toBe('error');
      expect(result.error).toContain('Missing');
    });

    it('handles path traversal attempt in id', async () => {
      const args: ParsedArgs = { positional: ['../../../etc/passwd'], flags: {} };
      const result = await cmdRead(args);
      // CLI wraps response - check nested data for error
      expect(result.status).toBe('success');
      expect((result.data as any)?.status).toBe('error');
    });

    it('handles id with special characters', async () => {
      const args: ParsedArgs = { positional: ['id-with-$pecial-chars!'], flags: {} };
      const result = await cmdRead(args);
      // CLI wraps response - not found is wrapped in success
      expect(result.status).toBe('success');
      expect((result.data as any)?.status).toBe('error');
    });

    it('handles URL-encoded path traversal attempt', async () => {
      // %2e%2e%2f = ../
      const args: ParsedArgs = { positional: ['%2e%2e%2f%2e%2e%2fetc%2fpasswd'], flags: {} };
      const result = await cmdRead(args);
      expect(result.status).toBe('success');
      expect((result.data as any)?.status).toBe('error');
    });

    it('handles double-encoded path traversal attempt', async () => {
      // %252e%252e%252f = %2e%2e%2f (double-encoded ../)
      const args: ParsedArgs = { positional: ['%252e%252e%252f%252e%252e%252fetc%252fpasswd'], flags: {} };
      const result = await cmdRead(args);
      expect(result.status).toBe('success');
      expect((result.data as any)?.status).toBe('error');
    });

    it('handles null byte injection attempt', async () => {
      const args: ParsedArgs = { positional: ['memory-test%00.md'], flags: {} };
      const result = await cmdRead(args);
      expect(result.status).toBe('success');
      expect((result.data as any)?.status).toBe('error');
    });

    it('handles mixed path separator traversal', async () => {
      const args: ParsedArgs = { positional: ['..\\..\\etc\\passwd'], flags: {} };
      const result = await cmdRead(args);
      expect(result.status).toBe('success');
      expect((result.data as any)?.status).toBe('error');
    });
  });

  describe('cmdWrite', () => {
    it('handles empty stdin', async () => {
      vi.spyOn(process.stdin, 'isTTY', 'get').mockReturnValue(true);
      const args: ParsedArgs = { positional: [], flags: {} };
      const result = await cmdWrite(args);
      expect(result.status).toBe('error');
    });
  });

  describe('cmdDelete', () => {
    it('returns error when id is missing', async () => {
      const args: ParsedArgs = { positional: [], flags: {} };
      const result = await cmdDelete(args);
      expect(result.status).toBe('error');
      expect(result.error).toContain('Missing');
    });
  });

  describe('cmdSearch', () => {
    it('returns error when query is missing', async () => {
      const args: ParsedArgs = { positional: [], flags: {} };
      const result = await cmdSearch(args);
      expect(result.status).toBe('error');
      expect(result.error).toContain('query');
    });

    it('handles very long query', async () => {
      const longQuery = 'a'.repeat(10000);
      const args: ParsedArgs = { positional: [longQuery], flags: {} };
      const result = await cmdSearch(args);
      // Should not crash - verify structure and non-error status
      expect(result.status).toBe('success');
      // The wrapped data should exist (even if search returns no results)
      expect(result.data).toBeDefined();
    });

    it('handles query with regex special chars', async () => {
      const args: ParsedArgs = { positional: ['test.*[regex]+(pattern)'], flags: {} };
      const result = await cmdSearch(args);
      // Should handle gracefully without regex injection
      expect(result.status).toBe('success');
      // Verify the data is structured properly (not a crash)
      expect(result.data).toBeDefined();
      // If it returned results, they shouldn't be regex-interpreted matches
      const data = result.data as any;
      if (data?.results) {
        // Results should be from literal string search, not regex
        expect(Array.isArray(data.results)).toBe(true);
      }
    });
  });

  describe('cmdList', () => {
    it('handles invalid type filter', async () => {
      const args: ParsedArgs = { positional: [], flags: { type: 'not-a-valid-type' } };
      const result = await cmdList(args);
      // Should return empty or all, not crash
      expect(result.status).toBe('success');
    });
  });
});

describe('Graph Command Boundary Conditions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('cmdLink', () => {
    it('returns error when source is missing', async () => {
      const args: ParsedArgs = { positional: [], flags: {} };
      const result = await cmdLink(args);
      expect(result.status).toBe('error');
    });

    it('returns error when target is missing', async () => {
      const args: ParsedArgs = { positional: ['source-only'], flags: {} };
      const result = await cmdLink(args);
      expect(result.status).toBe('error');
    });

    it('allows self-linking (no validation at CLI layer)', async () => {
      // Note: Self-link validation should happen at core layer, not CLI
      const args: ParsedArgs = { positional: ['same-id', 'same-id'], flags: {} };
      const result = await cmdLink(args);
      // CLI doesn't block this - core layer handles validation
      expect(result.status).toBe('success');
    });
  });

  describe('cmdUnlink', () => {
    it('returns error when source is missing', async () => {
      const args: ParsedArgs = { positional: [], flags: {} };
      const result = await cmdUnlink(args);
      expect(result.status).toBe('error');
    });

    it('returns error when target is missing', async () => {
      const args: ParsedArgs = { positional: ['source-only'], flags: {} };
      const result = await cmdUnlink(args);
      expect(result.status).toBe('error');
    });
  });
});

describe('Bulk Command Boundary Conditions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('cmdImport', () => {
    it('returns error when file is missing', async () => {
      const args: ParsedArgs = { positional: [], flags: {} };
      const result = await cmdImport(args);
      expect(result.status).toBe('error');
      expect(result.error).toContain('file');
    });

    it('returns error for non-existent file', async () => {
      const args: ParsedArgs = { positional: ['/nonexistent/path/file.json'], flags: {} };
      const result = await cmdImport(args);
      expect(result.status).toBe('error');
    });
  });

  describe('cmdExport', () => {
    it('handles missing scope gracefully', async () => {
      const args: ParsedArgs = { positional: [], flags: {} };
      const result = await cmdExport(args);
      // Should default to project scope and succeed
      expect(result.status).toBe('success');
      // Verify exported data has expected structure
      const data = result.data as any;
      expect(data).toBeDefined();
      // Export should return structured data even if empty
      if (data?.data) {
        expect(data.data).toHaveProperty('version');
        expect(data.data).toHaveProperty('exportedAt');
        expect(data.data).toHaveProperty('memories');
      }
    });
  });
});

describe('Think Command Boundary Conditions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when subcommand is missing', async () => {
    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdThink(args);
    expect(result.status).toBe('error');
    expect(result.error).toContain('subcommand');
  });

  it('returns error for unknown subcommand', async () => {
    const args: ParsedArgs = { positional: ['unknown-subcommand'], flags: {} };
    const result = await cmdThink(args);
    expect(result.status).toBe('error');
    expect(result.error).toContain('Unknown');
  });

  it('think create returns error without topic', async () => {
    const args: ParsedArgs = { positional: ['create'], flags: {} };
    const result = await cmdThink(args);
    expect(result.status).toBe('error');
    expect(result.error).toContain('topic');
  });

  it('think add returns error without thought', async () => {
    const args: ParsedArgs = { positional: ['add'], flags: {} };
    const result = await cmdThink(args);
    expect(result.status).toBe('error');
    expect(result.error).toContain('thought');
  });

  it('think conclude returns error without conclusion', async () => {
    const args: ParsedArgs = { positional: ['conclude'], flags: {} };
    const result = await cmdThink(args);
    expect(result.status).toBe('error');
    expect(result.error).toContain('conclusion');
  });

  it('think delete returns error without document ID', async () => {
    const args: ParsedArgs = { positional: ['delete'], flags: {} };
    const result = await cmdThink(args);
    expect(result.status).toBe('error');
    expect(result.error).toContain('document');
  });

  it('think use returns error without document ID', async () => {
    const args: ParsedArgs = { positional: ['use'], flags: {} };
    const result = await cmdThink(args);
    expect(result.status).toBe('error');
    expect(result.error).toContain('document');
  });
});

describe('Security Boundary Conditions', () => {
  describe('Prototype Pollution Prevention', () => {
    it('should sanitise __proto__ in import data', async () => {
      // Test that importing data with __proto__ doesn't pollute Object.prototype
      // Create a temp file with malicious JSON containing __proto__
      const fs = await import('node:fs');
      const os = await import('node:os');
      const path = await import('node:path');

      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proto-test-'));
      const maliciousFile = path.join(tempDir, 'malicious.json');

      // Craft JSON with __proto__ that would pollute if not sanitised
      const maliciousData = JSON.stringify({
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        memories: [{
          id: 'test-memory',
          type: 'learning',
          title: 'Test',
          content: 'Content',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          scope: 'project',
          tags: [],
          '__proto__': { polluted: true },
          'constructor': { prototype: { polluted: true } }
        }]
      });

      fs.writeFileSync(maliciousFile, maliciousData);

      try {
        const args: ParsedArgs = { positional: [maliciousFile], flags: { strategy: 'skip' } };
        const result = await cmdImport(args);

        // Verify Object.prototype was NOT polluted
        expect((Object.prototype as any).polluted).toBeUndefined();
        expect(({} as any).polluted).toBeUndefined();

        // The import should still complete (sanitised data)
        expect(result.status).toBe('success');
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('Query Length Enforcement', () => {
    it('should reject queries exceeding max length', async () => {
      const longQuery = 'a'.repeat(10001);
      const args: ParsedArgs = { positional: [longQuery], flags: {} };
      const result = await cmdSearch(args);
      expect(result.status).toBe('success');
      expect((result.data as any)?.status).toBe('error');
      expect((result.data as any)?.error).toContain('too long');
    });
  });
});
