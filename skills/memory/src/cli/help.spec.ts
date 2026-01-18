/**
 * Tests for CLI Help Text
 */

import { describe, it, expect } from 'vitest';
import { getHelpText, HELP_COMPACT, HELP_FULL } from './help.js';

describe('HELP_COMPACT', () => {
  it('includes skill name', () => {
    expect(HELP_COMPACT).toContain('Memory Skill');
  });

  it('includes core commands', () => {
    expect(HELP_COMPACT).toContain('write');
    expect(HELP_COMPACT).toContain('read');
    expect(HELP_COMPACT).toContain('list');
    expect(HELP_COMPACT).toContain('search');
    expect(HELP_COMPACT).toContain('delete');
  });

  it('includes graph commands', () => {
    expect(HELP_COMPACT).toContain('link');
    expect(HELP_COMPACT).toContain('unlink');
    expect(HELP_COMPACT).toContain('graph');
    expect(HELP_COMPACT).toContain('mermaid');
    expect(HELP_COMPACT).toContain('edges');
  });

  it('includes maintenance commands', () => {
    expect(HELP_COMPACT).toContain('health');
    expect(HELP_COMPACT).toContain('validate');
    expect(HELP_COMPACT).toContain('sync');
    expect(HELP_COMPACT).toContain('repair');
    expect(HELP_COMPACT).toContain('rebuild');
  });

  it('includes scope documentation', () => {
    expect(HELP_COMPACT).toContain('SCOPE:');
    expect(HELP_COMPACT).toContain('user');
    expect(HELP_COMPACT).toContain('project');
    expect(HELP_COMPACT).toContain('local');
    expect(HELP_COMPACT).toContain('enterprise');
  });

  it('includes examples section', () => {
    expect(HELP_COMPACT).toContain('EXAMPLES:');
  });

  it('includes think commands', () => {
    expect(HELP_COMPACT).toContain('think');
  });

  it('includes bulk operations', () => {
    expect(HELP_COMPACT).toContain('bulk-link');
    expect(HELP_COMPACT).toContain('bulk-delete');
  });

  it('mentions full help option', () => {
    expect(HELP_COMPACT).toContain('memory help --full');
  });
});

describe('HELP_FULL', () => {
  it('includes compact help content', () => {
    expect(HELP_FULL).toContain('Memory Skill');
    expect(HELP_FULL).toContain('COMMANDS:');
  });

  it('includes detailed command reference header', () => {
    expect(HELP_FULL).toContain('DETAILED COMMAND REFERENCE');
  });

  it('includes CRUD operations section', () => {
    expect(HELP_FULL).toContain('CRUD Operations:');
  });

  it('includes Graph operations section', () => {
    expect(HELP_FULL).toContain('Graph Operations:');
  });

  it('includes Quality & Health section', () => {
    expect(HELP_FULL).toContain('Quality & Health:');
  });

  it('includes Maintenance section', () => {
    expect(HELP_FULL).toContain('Maintenance:');
  });

  it('includes Thinking Documents section', () => {
    expect(HELP_FULL).toContain('Thinking Documents:');
  });

  it('includes flag documentation', () => {
    expect(HELP_FULL).toContain('Flags:');
    expect(HELP_FULL).toContain('--scope');
    expect(HELP_FULL).toContain('--limit');
  });

  it('documents think subcommands', () => {
    expect(HELP_FULL).toContain('think create');
    expect(HELP_FULL).toContain('think add');
    expect(HELP_FULL).toContain('think counter');
    expect(HELP_FULL).toContain('think branch');
    expect(HELP_FULL).toContain('think conclude');
    expect(HELP_FULL).toContain('think delete');
  });

  it('is longer than compact help', () => {
    expect(HELP_FULL.length).toBeGreaterThan(HELP_COMPACT.length);
  });
});

describe('getHelpText', () => {
  it('returns compact help by default', () => {
    const result = getHelpText();
    expect(result).toBe(HELP_COMPACT);
  });

  it('returns compact help when full=false', () => {
    const result = getHelpText(false);
    expect(result).toBe(HELP_COMPACT);
  });

  it('returns full help when full=true', () => {
    const result = getHelpText(true);
    expect(result).toBe(HELP_FULL);
  });
});
