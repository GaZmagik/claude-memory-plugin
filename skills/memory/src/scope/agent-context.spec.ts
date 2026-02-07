/**
 * Tests for agent-context utility
 */

import { describe, it, expect } from 'vitest';
import { createAgentContext, validateAgentContext } from './agent-context.js';
import { Scope } from '../types/enums.js';

describe('createAgentContext', () => {
  describe('valid inputs', () => {
    it('creates context with sanitised agent name', () => {
      const result = createAgentContext({
        agentName: 'TypeScript Expert',
        scope: Scope.AgentProject,
      });
      expect(result).toEqual({
        agentName: 'typescript-expert',
        scope: Scope.AgentProject,
      });
    });

    it('creates context for AgentGlobal scope', () => {
      const result = createAgentContext({
        agentName: 'rust-expert',
        scope: Scope.AgentGlobal,
      });
      expect(result).toEqual({
        agentName: 'rust-expert',
        scope: Scope.AgentGlobal,
      });
    });

    it('preserves already-valid agent names', () => {
      const result = createAgentContext({
        agentName: 'typescript-expert',
        scope: Scope.AgentProject,
      });
      expect(result.agentName).toBe('typescript-expert');
    });
  });

  describe('scope validation', () => {
    it('throws for Scope.Project', () => {
      expect(() =>
        createAgentContext({
          agentName: 'typescript-expert',
          scope: Scope.Project,
        })
      ).toThrow('must be an agent scope');
    });

    it('throws for Scope.Global', () => {
      expect(() =>
        createAgentContext({
          agentName: 'typescript-expert',
          scope: Scope.Global,
        })
      ).toThrow('must be an agent scope');
    });

    it('throws for Scope.Local', () => {
      expect(() =>
        createAgentContext({
          agentName: 'typescript-expert',
          scope: Scope.Local,
        })
      ).toThrow('must be an agent scope');
    });

    it('throws for Scope.Enterprise', () => {
      expect(() =>
        createAgentContext({
          agentName: 'typescript-expert',
          scope: Scope.Enterprise,
        })
      ).toThrow('must be an agent scope');
    });
  });

  describe('agent name validation', () => {
    it('throws for empty agent name', () => {
      expect(() =>
        createAgentContext({
          agentName: '',
          scope: Scope.AgentProject,
        })
      ).toThrow('cannot be empty');
    });

    it('throws for whitespace-only agent name', () => {
      expect(() =>
        createAgentContext({
          agentName: '   ',
          scope: Scope.AgentProject,
        })
      ).toThrow('cannot be empty');
    });

    it('throws for reserved name after sanitisation', () => {
      expect(() =>
        createAgentContext({
          agentName: 'project',
          scope: Scope.AgentProject,
        })
      ).toThrow('reserved');
    });

    it('throws for name with no valid characters after sanitisation', () => {
      expect(() =>
        createAgentContext({
          agentName: '!@#$%',
          scope: Scope.AgentProject,
        })
      ).toThrow();
    });
  });

  describe('examples from docstring', () => {
    it('handles TypeScript Expert example', () => {
      const result = createAgentContext({
        agentName: 'TypeScript Expert',
        scope: Scope.AgentProject,
      });
      expect(result).toEqual({
        agentName: 'typescript-expert',
        scope: Scope.AgentProject,
      });
    });
  });
});

describe('validateAgentContext', () => {
  describe('valid contexts', () => {
    it('validates correct AgentProject context', () => {
      const result = validateAgentContext({
        agentName: 'typescript-expert',
        scope: Scope.AgentProject,
      });
      expect(result).toEqual({ valid: true });
    });

    it('validates correct AgentGlobal context', () => {
      const result = validateAgentContext({
        agentName: 'rust-expert',
        scope: Scope.AgentGlobal,
      });
      expect(result).toEqual({ valid: true });
    });
  });

  describe('scope validation', () => {
    it('rejects non-agent scopes', () => {
      const result = validateAgentContext({
        agentName: 'typescript-expert',
        scope: Scope.Project,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('agent scope');
    });
  });

  describe('agent name validation', () => {
    it('rejects empty agent name', () => {
      const result = validateAgentContext({
        agentName: '',
        scope: Scope.AgentProject,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('rejects unsanitised agent name', () => {
      const result = validateAgentContext({
        agentName: 'TypeScript Expert',
        scope: Scope.AgentProject,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid');
    });

    it('rejects reserved name', () => {
      const result = validateAgentContext({
        agentName: 'project',
        scope: Scope.AgentProject,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('reserved');
    });
  });

  describe('examples from docstring', () => {
    it('validates typescript-expert example', () => {
      const result = validateAgentContext({
        agentName: 'typescript-expert',
        scope: Scope.AgentProject,
      });
      expect(result).toEqual({ valid: true });
    });

    it('invalidates TypeScript Expert example', () => {
      const result = validateAgentContext({
        agentName: 'TypeScript Expert',
        scope: Scope.AgentProject,
      });
      expect(result.valid).toBe(false);
    });
  });
});
