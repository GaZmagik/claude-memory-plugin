/**
 * Tests for CLI Argument Parser
 */

import { describe, it, expect } from 'vitest';
import {
  parseArgs,
  getFlagString,
  getFlagBool,
  getFlagNumber,
} from './parser.js';

describe('parseArgs', () => {
  it('parses positional arguments', () => {
    const result = parseArgs(['read', 'my-id']);
    expect(result.positional).toEqual(['read', 'my-id']);
    expect(result.flags).toEqual({});
  });

  it('parses long flags with values', () => {
    const result = parseArgs(['--scope', 'local', '--limit', '10']);
    expect(result.flags).toEqual({ scope: 'local', limit: '10' });
    expect(result.positional).toEqual([]);
  });

  it('parses boolean long flags', () => {
    const result = parseArgs(['--verbose', '--dry-run']);
    expect(result.flags).toEqual({ verbose: true, 'dry-run': true });
  });

  it('parses short flags with values', () => {
    const result = parseArgs(['-s', 'local', '-l', '10']);
    expect(result.flags).toEqual({ s: 'local', l: '10' });
  });

  it('parses boolean short flags', () => {
    const result = parseArgs(['-v', '-d']);
    expect(result.flags).toEqual({ v: true, d: true });
  });

  it('parses mixed positional and flags', () => {
    const result = parseArgs(['read', 'my-id', '--scope', 'local', '--verbose']);
    expect(result.positional).toEqual(['read', 'my-id']);
    expect(result.flags).toEqual({ scope: 'local', verbose: true });
  });

  it('handles --help flag specially', () => {
    const result = parseArgs(['read', '--help']);
    expect(result.flags.help).toBe(true);
    expect(result.positional).toEqual(['read']);
  });

  it('handles -h flag specially', () => {
    const result = parseArgs(['-h']);
    expect(result.flags.help).toBe(true);
  });

  it('handles --full flag specially', () => {
    const result = parseArgs(['help', '--full']);
    expect(result.flags.full).toBe(true);
  });

  it('handles -f flag specially', () => {
    const result = parseArgs(['help', '-f']);
    expect(result.flags.full).toBe(true);
  });

  it('treats flag-like values after flags as values', () => {
    // --output --my-file should treat --my-file as a boolean flag, not a value
    const result = parseArgs(['--output', '--my-file']);
    expect(result.flags.output).toBe(true);
    expect(result.flags['my-file']).toBe(true);
  });

  it('handles empty args', () => {
    const result = parseArgs([]);
    expect(result.positional).toEqual([]);
    expect(result.flags).toEqual({});
  });

  it('handles complex real-world example', () => {
    const result = parseArgs([
      'query',
      '--type', 'decision',
      '--tags', 'typescript,architecture',
      '--has-edges',
      '--limit', '20',
    ]);
    expect(result.positional).toEqual(['query']);
    expect(result.flags).toEqual({
      type: 'decision',
      tags: 'typescript,architecture',
      'has-edges': true,
      limit: '20',
    });
  });

  describe('--flag=value syntax', () => {
    it('parses --flag=value syntax', () => {
      const result = parseArgs(['--name=value']);
      expect(result.flags.name).toBe('value');
    });

    it('parses --flag=value with multiple flags', () => {
      const result = parseArgs(['--scope=local', '--limit=10']);
      expect(result.flags.scope).toBe('local');
      expect(result.flags.limit).toBe('10');
    });

    it('handles empty value after equals as boolean', () => {
      const result = parseArgs(['--flag=']);
      expect(result.flags.flag).toBe(true);
    });

    it('handles value with equals sign', () => {
      const result = parseArgs(['--equation=1+1=2']);
      expect(result.flags.equation).toBe('1+1=2');
    });

    it('mixes --flag=value with other styles', () => {
      const result = parseArgs([
        'command',
        '--type=decision',
        '--scope', 'local',
        '-v',
        '--dry-run',
      ]);
      expect(result.positional).toEqual(['command']);
      expect(result.flags.type).toBe('decision');
      expect(result.flags.scope).toBe('local');
      expect(result.flags.v).toBe(true);
      expect(result.flags['dry-run']).toBe(true);
    });

    it('handles path values with equals', () => {
      const result = parseArgs(['--file=/path/to/file.txt']);
      expect(result.flags.file).toBe('/path/to/file.txt');
    });
  });
});

describe('getFlagString', () => {
  const flags: Record<string, string | boolean> = {
    scope: 'local',
    verbose: true,
    empty: '',
  };

  it('returns string value for string flag', () => {
    expect(getFlagString(flags, 'scope')).toBe('local');
  });

  it('returns undefined for boolean flag', () => {
    expect(getFlagString(flags, 'verbose')).toBeUndefined();
  });

  it('returns undefined for missing flag', () => {
    expect(getFlagString(flags, 'missing')).toBeUndefined();
  });

  it('returns default for missing flag', () => {
    expect(getFlagString(flags, 'missing', 'default')).toBe('default');
  });

  it('returns empty string when value is empty', () => {
    expect(getFlagString(flags, 'empty')).toBe('');
  });
});

describe('getFlagBool', () => {
  const flags: Record<string, string | boolean> = {
    verbose: true,
    quiet: false,
    enabled: 'true',
    disabled: 'false',
    scope: 'local',
  };

  it('returns true for boolean true', () => {
    expect(getFlagBool(flags, 'verbose')).toBe(true);
  });

  it('returns false for boolean false', () => {
    expect(getFlagBool(flags, 'quiet')).toBe(false);
  });

  it('returns true for string "true"', () => {
    expect(getFlagBool(flags, 'enabled')).toBe(true);
  });

  it('returns false for string "false"', () => {
    expect(getFlagBool(flags, 'disabled')).toBe(false);
  });

  it('returns false for other string values', () => {
    expect(getFlagBool(flags, 'scope')).toBe(false);
  });

  it('returns false for missing flag', () => {
    expect(getFlagBool(flags, 'missing')).toBe(false);
  });
});

describe('getFlagNumber', () => {
  const flags: Record<string, string | boolean> = {
    limit: '10',
    threshold: '0.85',
    invalid: 'abc',
    verbose: true,
  };

  it('parses integer string', () => {
    expect(getFlagNumber(flags, 'limit')).toBe(10);
  });

  it('parses float string', () => {
    expect(getFlagNumber(flags, 'threshold')).toBe(0.85);
  });

  it('returns default for invalid number', () => {
    expect(getFlagNumber(flags, 'invalid', 5)).toBe(5);
  });

  it('returns undefined for invalid number without default', () => {
    expect(getFlagNumber(flags, 'invalid')).toBeUndefined();
  });

  it('returns default for boolean flag', () => {
    expect(getFlagNumber(flags, 'verbose', 0)).toBe(0);
  });

  it('returns undefined for missing flag', () => {
    expect(getFlagNumber(flags, 'missing')).toBeUndefined();
  });

  it('returns default for missing flag', () => {
    expect(getFlagNumber(flags, 'missing', 100)).toBe(100);
  });
});
