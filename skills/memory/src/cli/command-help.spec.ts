/**
 * Command Help Tests
 *
 * Tests for per-command help functionality.
 */

import { describe, it, expect } from 'vitest';
import {
  COMMAND_HELP,
  getCommandHelp,
  hasCommandHelp,
  formatCommandHelp,
  type CommandHelpEntry,
} from './command-help.js';

describe('COMMAND_HELP registry', () => {
  it('has help for all major commands', () => {
    const expectedCommands = [
      'write', 'read', 'list', 'delete', 'search', 'semantic',
      'tag', 'untag',
      'link', 'unlink', 'graph', 'mermaid', 'edges', 'remove-node',
      'health', 'validate', 'quality', 'audit', 'audit-quick',
      'sync', 'repair', 'rebuild', 'reindex', 'prune', 'sync-frontmatter',
      'rename', 'move', 'promote', 'demote', 'archive', 'status',
      'bulk-link', 'bulk-delete', 'export', 'import',
      'suggest-links', 'summarize',
      'query', 'stats', 'impact',
      'think',
      'help',
    ];

    for (const cmd of expectedCommands) {
      expect(COMMAND_HELP[cmd], `Missing help for: ${cmd}`).toBeDefined();
    }
  });

  it('all entries have required fields', () => {
    for (const [cmd, help] of Object.entries(COMMAND_HELP)) {
      expect(help.usage, `${cmd}: missing usage`).toBeDefined();
      expect(help.description, `${cmd}: missing description`).toBeDefined();
      expect(help.usage.length, `${cmd}: usage too short`).toBeGreaterThan(5);
      expect(help.description.length, `${cmd}: description too short`).toBeGreaterThan(5);
    }
  });

  it('usage fields start with "memory"', () => {
    for (const [cmd, help] of Object.entries(COMMAND_HELP)) {
      expect(help.usage, `${cmd}: usage should start with "memory"`).toMatch(/^memory /);
    }
  });
});

describe('getCommandHelp', () => {
  it('returns formatted help for known command', () => {
    const help = getCommandHelp('write');
    expect(help).toBeDefined();
    expect(help).toContain('memory write');
    expect(help).toContain('USAGE:');
    expect(help).toContain('Create or update a memory');
  });

  it('returns undefined for unknown command', () => {
    const help = getCommandHelp('nonexistent-command');
    expect(help).toBeUndefined();
  });

  it('includes flags section when available', () => {
    const help = getCommandHelp('write');
    expect(help).toContain('FLAGS:');
    expect(help).toContain('--auto-link');
  });

  it('includes examples section when available', () => {
    const help = getCommandHelp('write');
    expect(help).toContain('EXAMPLES:');
  });

  it('includes notes section when available', () => {
    const help = getCommandHelp('write');
    expect(help).toContain('NOTES:');
  });

  it('includes subcommands for think command', () => {
    const help = getCommandHelp('think');
    expect(help).toContain('SUBCOMMANDS:');
    expect(help).toContain('create <topic>');
    expect(help).toContain('add <thought>');
    expect(help).toContain('conclude <text>');
  });

  it('includes arguments section when available', () => {
    const help = getCommandHelp('read');
    expect(help).toContain('ARGUMENTS:');
    expect(help).toContain('<id>');
  });
});

describe('hasCommandHelp', () => {
  it('returns true for known commands', () => {
    expect(hasCommandHelp('write')).toBe(true);
    expect(hasCommandHelp('read')).toBe(true);
    expect(hasCommandHelp('think')).toBe(true);
  });

  it('returns false for unknown commands', () => {
    expect(hasCommandHelp('nonexistent')).toBe(false);
    expect(hasCommandHelp('')).toBe(false);
  });
});

describe('formatCommandHelp', () => {
  it('formats basic help entry', () => {
    const entry: CommandHelpEntry = {
      usage: 'memory test',
      description: 'A test command',
    };
    const formatted = formatCommandHelp('test', entry);

    expect(formatted).toContain('memory test - A test command');
    expect(formatted).toContain('USAGE:');
    expect(formatted).toContain('  memory test');
  });

  it('formats help with all sections', () => {
    const entry: CommandHelpEntry = {
      usage: 'memory full <arg>',
      description: 'Full featured command',
      arguments: '  <arg>    The argument',
      flags: '  --flag    A flag',
      subcommands: '  sub    A subcommand',
      examples: ['memory full example1', 'memory full example2'],
      notes: '  Some important notes',
    };
    const formatted = formatCommandHelp('full', entry);

    expect(formatted).toContain('ARGUMENTS:');
    expect(formatted).toContain('FLAGS:');
    expect(formatted).toContain('SUBCOMMANDS:');
    expect(formatted).toContain('EXAMPLES:');
    expect(formatted).toContain('NOTES:');
    expect(formatted).toContain('memory full example1');
    expect(formatted).toContain('memory full example2');
  });

  it('omits empty sections', () => {
    const entry: CommandHelpEntry = {
      usage: 'memory minimal',
      description: 'Minimal command',
    };
    const formatted = formatCommandHelp('minimal', entry);

    expect(formatted).not.toContain('ARGUMENTS:');
    expect(formatted).not.toContain('FLAGS:');
    expect(formatted).not.toContain('SUBCOMMANDS:');
    expect(formatted).not.toContain('EXAMPLES:');
    expect(formatted).not.toContain('NOTES:');
  });
});
