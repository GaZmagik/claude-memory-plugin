/**
 * Enum Tests - Verify type system is correctly defined
 */

import { describe, it, expect } from 'vitest';
import { MemoryType, Scope, Severity, EdgeType } from './enums.js';

describe('MemoryType enum', () => {
  it('should have all required memory types', () => {
    expect(MemoryType.Decision).toBe('decision');
    expect(MemoryType.Learning).toBe('learning');
    expect(MemoryType.Artifact).toBe('artifact');
    expect(MemoryType.Gotcha).toBe('gotcha');
    expect(MemoryType.Breadcrumb).toBe('breadcrumb');
    expect(MemoryType.Hub).toBe('hub');
  });

  it('should have exactly 8 memory types', () => {
    const types = Object.values(MemoryType);
    expect(types).toHaveLength(8);
  });

  it('should have Rule memory type', () => {
    expect(MemoryType.Rule).toBe('rule');
  });

  it('should have Reminder memory type', () => {
    expect(MemoryType.Reminder).toBe('reminder');
  });
});

describe('Scope enum', () => {
  it('should have all 6 scope tiers', () => {
    expect(Scope.Enterprise).toBe('enterprise');
    expect(Scope.Local).toBe('local');
    expect(Scope.Project).toBe('project');
    expect(Scope.Global).toBe('global');
    expect(Scope.AgentProject).toBe('agent-project');
    expect(Scope.AgentGlobal).toBe('agent-global');
  });

  it('should have exactly 6 scopes', () => {
    const scopes = Object.values(Scope);
    expect(scopes).toHaveLength(6);
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

  it('should have GovernedBy edge type for external rule nodes', () => {
    expect(EdgeType.GovernedBy).toBe('governed-by');
  });

  it('should have RemindedBy edge type for external reminder nodes', () => {
    expect(EdgeType.RemindedBy).toBe('reminded-by');
  });
});
