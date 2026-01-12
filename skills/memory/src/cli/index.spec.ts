/**
 * Tests for CLI Command Dispatcher
 *
 * Note: Command handlers are tested in their respective spec files.
 * This file tests the dispatcher routing logic and help system.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { dispatch, getAvailableCommands } from './index.js';

describe('dispatch', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('help routing', () => {
    it('shows help when no args provided', async () => {
      const exitCode = await dispatch([]);
      expect(exitCode).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0][0]).toContain('Memory Skill');
    });

    it('shows help for explicit help command', async () => {
      const exitCode = await dispatch(['help']);
      expect(exitCode).toBe(0);
      expect(consoleSpy.mock.calls[0][0]).toContain('Memory Skill');
    });

    it('shows full help with --full flag', async () => {
      const exitCode = await dispatch(['help', '--full']);
      expect(exitCode).toBe(0);
      expect(consoleSpy.mock.calls[0][0]).toContain('DETAILED COMMAND REFERENCE');
    });

    it('shows full help with -f flag', async () => {
      const exitCode = await dispatch(['help', '-f']);
      expect(exitCode).toBe(0);
      expect(consoleSpy.mock.calls[0][0]).toContain('DETAILED COMMAND REFERENCE');
    });

    it('shows command-specific help when --help flag used', async () => {
      const exitCode = await dispatch(['read', '--help']);
      expect(exitCode).toBe(0);
      // Should show command-specific help, not generic help
      expect(consoleSpy.mock.calls[0][0]).toContain('memory read');
      expect(consoleSpy.mock.calls[0][0]).toContain('Read a memory by its ID');
    });

    it('shows command-specific help when -h flag used', async () => {
      const exitCode = await dispatch(['list', '-h']);
      expect(exitCode).toBe(0);
      expect(consoleSpy.mock.calls[0][0]).toContain('memory list');
      expect(consoleSpy.mock.calls[0][0]).toContain('List all memories');
    });

    it('shows help for specific command via help <command>', async () => {
      const exitCode = await dispatch(['help', 'write']);
      expect(exitCode).toBe(0);
      expect(consoleSpy.mock.calls[0][0]).toContain('memory write');
      expect(consoleSpy.mock.calls[0][0]).toContain('Create or update a memory');
    });

    it('shows generic help for unknown command in help <command>', async () => {
      const exitCode = await dispatch(['help', 'nonexistent']);
      expect(exitCode).toBe(0);
      expect(consoleSpy.mock.calls[0][0]).toContain('Unknown command: nonexistent');
      // Should fall back to showing the command list
      expect(consoleSpy.mock.calls[1][0]).toBe('');
      expect(consoleSpy.mock.calls[2][0]).toContain('COMMANDS:');
    });

    it('shows generic help when --help used on unknown command', async () => {
      // Parser sees --help flag before command lookup
      const exitCode = await dispatch(['unknowncmd', '--help']);
      expect(exitCode).toBe(0);
      // Unknown command has no specific help, falls back to generic
      expect(consoleSpy.mock.calls[0][0]).toContain('COMMANDS:');
    });
  });

  describe('unknown command handling', () => {
    it('returns error for unknown command', async () => {
      const exitCode = await dispatch(['unknown-command']);
      expect(exitCode).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown command: unknown-command')
      );
    });

    it('returns error for misspelled command', async () => {
      const exitCode = await dispatch(['raed']); // typo for 'read'
      expect(exitCode).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown command: raed')
      );
    });

    it('suggests running help for unknown commands', async () => {
      const exitCode = await dispatch(['foo-bar']);
      expect(exitCode).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('memory help')
      );
    });
  });
});

describe('getAvailableCommands', () => {
  it('returns an array', () => {
    const commands = getAvailableCommands();
    expect(Array.isArray(commands)).toBe(true);
  });

  it('has more than 30 commands', () => {
    const commands = getAvailableCommands();
    expect(commands.length).toBeGreaterThan(30);
  });

  it('is sorted alphabetically', () => {
    const commands = getAvailableCommands();
    const sorted = [...commands].sort();
    expect(commands).toEqual(sorted);
  });

  it('includes CRUD commands', () => {
    const commands = getAvailableCommands();
    expect(commands).toContain('read');
    expect(commands).toContain('write');
    expect(commands).toContain('list');
    expect(commands).toContain('delete');
    expect(commands).toContain('search');
    expect(commands).toContain('semantic');
  });

  it('includes graph commands', () => {
    const commands = getAvailableCommands();
    expect(commands).toContain('link');
    expect(commands).toContain('unlink');
    expect(commands).toContain('graph');
    expect(commands).toContain('mermaid');
    expect(commands).toContain('edges');
    expect(commands).toContain('remove-node');
  });

  it('includes quality commands', () => {
    const commands = getAvailableCommands();
    expect(commands).toContain('health');
    expect(commands).toContain('validate');
    expect(commands).toContain('quality');
    expect(commands).toContain('audit');
    expect(commands).toContain('audit-quick');
  });

  it('includes maintenance commands', () => {
    const commands = getAvailableCommands();
    expect(commands).toContain('sync');
    expect(commands).toContain('repair');
    expect(commands).toContain('rebuild');
    expect(commands).toContain('reindex');
    expect(commands).toContain('prune');
    expect(commands).toContain('sync-frontmatter');
  });

  it('includes utility commands', () => {
    const commands = getAvailableCommands();
    expect(commands).toContain('rename');
    expect(commands).toContain('move');
    expect(commands).toContain('promote');
    expect(commands).toContain('demote');
    expect(commands).toContain('archive');
    expect(commands).toContain('status');
  });

  it('includes bulk commands', () => {
    const commands = getAvailableCommands();
    expect(commands).toContain('bulk-link');
    expect(commands).toContain('bulk-delete');
    expect(commands).toContain('export');
    expect(commands).toContain('import');
  });

  it('includes query commands', () => {
    const commands = getAvailableCommands();
    expect(commands).toContain('query');
    expect(commands).toContain('stats');
    expect(commands).toContain('impact');
  });

  it('includes suggestion commands', () => {
    const commands = getAvailableCommands();
    expect(commands).toContain('suggest-links');
    expect(commands).toContain('summarize');
  });

  it('includes tag commands', () => {
    const commands = getAvailableCommands();
    expect(commands).toContain('tag');
    expect(commands).toContain('untag');
  });

  it('includes think command', () => {
    const commands = getAvailableCommands();
    expect(commands).toContain('think');
  });

  it('includes help command', () => {
    const commands = getAvailableCommands();
    expect(commands).toContain('help');
  });
});
