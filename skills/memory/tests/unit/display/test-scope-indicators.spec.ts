/**
 * Tests for Scope Indicator Formatting (Phase E - T103)
 *
 * Tests visual formatting of scope indicators for agent-scoped memories.
 */

import { describe, it, expect } from 'vitest';
import { formatScopeIndicator } from '../../../src/display/format-scope-indicator.js';
import { Scope } from '../../../src/types/enums.js';

describe('formatScopeIndicator', () => {
  it('formats project scope indicator', () => {
    const result = formatScopeIndicator(Scope.Project);
    expect(result).toBe('[project]');
  });

  it('formats global scope indicator', () => {
    const result = formatScopeIndicator(Scope.Global);
    expect(result).toBe('[global]');
  });

  it('formats local scope indicator', () => {
    const result = formatScopeIndicator(Scope.Local);
    expect(result).toBe('[local]');
  });

  it('formats agent-project scope indicator', () => {
    const result = formatScopeIndicator(Scope.AgentProject);
    expect(result).toBe('[agent:project]');
  });

  it('formats agent-global scope indicator', () => {
    const result = formatScopeIndicator(Scope.AgentGlobal);
    expect(result).toBe('[agent:global]');
  });

  it('formats agent-project scope with agent name', () => {
    const result = formatScopeIndicator(Scope.AgentProject, 'typescript-pro');
    expect(result).toBe('[agent:typescript-pro]');
  });

  it('formats agent-global scope with agent name', () => {
    const result = formatScopeIndicator(Scope.AgentGlobal, 'rust-expert');
    expect(result).toBe('[agent:rust-expert@global]');
  });

  it('handles missing agent name for agent scopes', () => {
    const result = formatScopeIndicator(Scope.AgentProject);
    expect(result).toBe('[agent:project]');
  });

  it('ignores agent name for non-agent scopes', () => {
    const result = formatScopeIndicator(Scope.Project, 'ignored-name');
    expect(result).toBe('[project]');
  });

  it('uses compact format when specified', () => {
    const result = formatScopeIndicator(Scope.AgentProject, 'typescript-pro', { compact: true });
    expect(result).toBe('[a:typescript-pro]');
  });

  it('uses compact format for global agent scope', () => {
    const result = formatScopeIndicator(Scope.AgentGlobal, 'rust-expert', { compact: true });
    expect(result).toBe('[a:rust-expert@g]');
  });

  it('uses color codes when color option enabled', () => {
    const result = formatScopeIndicator(Scope.Project, undefined, { color: true });
    expect(result).toContain('\x1b['); // ANSI color code
    expect(result).toContain('[project]');
  });

  it('sanitizes agent name in indicator', () => {
    const result = formatScopeIndicator(Scope.AgentProject, 'TypeScript Pro!');
    expect(result).toBe('[agent:typescript-pro]');
  });
});
