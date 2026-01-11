/**
 * Enum Tests - Verify type system is correctly defined
 */

import { describe, it, expect } from 'vitest';
import { MemoryType, Scope, Severity, EdgeType } from '../../../skills/memory/src/types/enums.js';

describe('MemoryType enum', () => {
  it('should have all required memory types', () => {
    expect(MemoryType.Decision).toBe('decision');
    expect(MemoryType.Learning).toBe('learning');
    expect(MemoryType.Artifact).toBe('artifact');
    expect(MemoryType.Gotcha).toBe('gotcha');
    expect(MemoryType.Breadcrumb).toBe('breadcrumb');
    expect(MemoryType.Hub).toBe('hub');
  });

  it('should have exactly 6 memory types', () => {
    const types = Object.values(MemoryType);
    expect(types).toHaveLength(6);
  });
});

describe('Scope enum', () => {
  it('should have all 4 scope tiers', () => {
    expect(Scope.Enterprise).toBe('enterprise');
    expect(Scope.Local).toBe('local');
    expect(Scope.Project).toBe('project');
    expect(Scope.Global).toBe('global');
  });

  it('should have exactly 4 scopes', () => {
    const scopes = Object.values(Scope);
    expect(scopes).toHaveLength(4);
  });
});

describe('Severity enum', () => {
  it('should have all severity levels', () => {
    expect(Severity.Low).toBe('low');
    expect(Severity.Medium).toBe('medium');
    expect(Severity.High).toBe('high');
    expect(Severity.Critical).toBe('critical');
  });
});

describe('EdgeType enum', () => {
  it('should have relationship types for graph edges', () => {
    expect(EdgeType.RelatesTo).toBe('relates-to');
    expect(EdgeType.Implements).toBe('implements');
    expect(EdgeType.Supersedes).toBe('supersedes');
    expect(EdgeType.BlockedBy).toBe('blocked-by');
    expect(EdgeType.Informs).toBe('informs');
    expect(EdgeType.Exemplifies).toBe('exemplifies');
    expect(EdgeType.RelatedContext).toBe('related-context');
  });
});
