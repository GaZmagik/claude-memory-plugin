/**
 * Tests for command-help formatter utilities
 */

import { describe, it, expect } from 'vitest';
import { formatDiscoveredList } from './formatter.js';

describe('formatDiscoveredList', () => {
  it('returns "(none found)" for an empty array', () => {
    expect(formatDiscoveredList([])).toBe('    (none found)');
  });

  it('formats a single item with no description', () => {
    const result = formatDiscoveredList([{ name: 'my-agent', source: 'user' }]);
    expect(result).toBe('    my-agent (user)');
  });

  it('formats a single item with a description', () => {
    const result = formatDiscoveredList([
      { name: 'my-agent', source: 'user', description: 'Does stuff' },
    ]);
    expect(result).toBe('    my-agent (user) - Does stuff');
  });

  it('joins multiple items with newlines', () => {
    const result = formatDiscoveredList([
      { name: 'agent-a', source: 'user' },
      { name: 'agent-b', source: 'project', description: 'B agent' },
    ]);
    expect(result).toBe('    agent-a (user)\n    agent-b (project) - B agent');
  });

  it('omits the description separator when description is an empty string', () => {
    const result = formatDiscoveredList([
      { name: 'agent', source: 'src', description: '' },
    ]);
    expect(result).toBe('    agent (src)');
  });

  it('includes source in parentheses for every item', () => {
    const result = formatDiscoveredList([
      { name: 'style-one', source: 'built-in' },
      { name: 'style-two', source: 'plugin' },
    ]);
    expect(result).toContain('(built-in)');
    expect(result).toContain('(plugin)');
  });
});
