import { describe, it, expect } from 'vitest';
import { createAgentContext, validateAgentContext } from '../../skills/memory/src/scope/agent-context.js';
import { Scope } from '../../skills/memory/src/types/enums.js';

describe('AgentContext creation and validation (integration)', () => {
  describe('createAgentContext', () => {
    it('should create valid agent context with sanitised name', () => {
      const context = createAgentContext({
        agentName: 'TypeScript Expert',
        scope: Scope.AgentProject,
      });

      expect(context.agentName).toBe('typescript-expert');
      expect(context.scope).toBe(Scope.AgentProject);
    });

    it('should preserve already-sanitised names', () => {
      const context = createAgentContext({
        agentName: 'typescript-expert',
        scope: Scope.AgentGlobal,
      });

      expect(context.agentName).toBe('typescript-expert');
      expect(context.scope).toBe(Scope.AgentGlobal);
    });

    it('should throw error for invalid agent names after sanitisation', () => {
      expect(() =>
        createAgentContext({
          agentName: '!!!',
          scope: Scope.AgentProject,
        })
      ).toThrow();
    });

    it('should throw error for empty agent names', () => {
      expect(() =>
        createAgentContext({
          agentName: '',
          scope: Scope.AgentProject,
        })
      ).toThrow('agentName cannot be empty');
    });

    it('should throw error for non-agent scopes', () => {
      expect(() =>
        createAgentContext({
          agentName: 'typescript-expert',
          scope: Scope.Project,
        })
      ).toThrow('must be an agent scope');
    });

    it('should handle different agent names', () => {
      const contexts = [
        { input: 'Rust Systems', expected: 'rust-systems' },
        { input: 'API_Architect', expected: 'api-architect' },
        { input: 'Rust (Systems)', expected: 'rust-systems' },
      ];

      contexts.forEach(({ input, expected }) => {
        const context = createAgentContext({
          agentName: input,
          scope: Scope.AgentProject,
        });
        expect(context.agentName).toBe(expected);
      });
    });
  });

  describe('validateAgentContext', () => {
    it('should validate correct agent context', () => {
      const context = {
        agentName: 'typescript-expert',
        scope: Scope.AgentProject,
      };

      expect(validateAgentContext(context)).toEqual({ valid: true });
    });

    it('should reject context with invalid agent name', () => {
      const context = {
        agentName: 'TypeScript Expert',
        scope: Scope.AgentProject,
      };

      const result = validateAgentContext(context);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid');
    });

    it('should reject context with empty agent name', () => {
      const context = {
        agentName: '',
        scope: Scope.AgentProject,
      };

      const result = validateAgentContext(context);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should reject context with non-agent scope', () => {
      const context = {
        agentName: 'typescript-expert',
        scope: Scope.Project,
      };

      const result = validateAgentContext(context);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be an agent scope');
    });

    it('should reject context with reserved agent name', () => {
      const context = {
        agentName: 'project',
        scope: Scope.AgentProject,
      };

      const result = validateAgentContext(context);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('reserved');
    });

    it('should provide helpful error messages', () => {
      const invalidContexts = [
        {
          context: { agentName: '', scope: Scope.AgentProject },
          expectedError: 'empty',
        },
        {
          context: { agentName: 'Invalid Name!', scope: Scope.AgentProject },
          expectedError: 'invalid',
        },
        {
          context: { agentName: 'typescript-expert', scope: Scope.Global },
          expectedError: 'agent scope',
        },
      ];

      invalidContexts.forEach(({ context, expectedError }) => {
        const result = validateAgentContext(context);
        expect(result.valid).toBe(false);
        expect(result.error?.toLowerCase()).toContain(expectedError.toLowerCase());
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should create and validate context in single workflow', () => {
      const context = createAgentContext({
        agentName: 'TypeScript Expert',
        scope: Scope.AgentProject,
      });

      const validation = validateAgentContext(context);
      expect(validation.valid).toBe(true);
    });

    it('should handle round-trip creation and validation', () => {
      const inputs = [
        'TypeScript Expert',
        'API_Architect',
        'Rust (Systems)',
      ];

      inputs.forEach(input => {
        const context = createAgentContext({
          agentName: input,
          scope: Scope.AgentGlobal,
        });

        const validation = validateAgentContext(context);
        expect(validation.valid).toBe(true);
      });
    });
  });
});
