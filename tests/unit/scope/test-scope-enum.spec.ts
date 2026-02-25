import { describe, it, expect } from 'vitest';
import { Scope } from '../../../skills/memory/src/types/enums.js';

describe('Scope enum - Agent scope extension', () => {
  describe('AgentProject scope', () => {
    it('should have AgentProject value', () => {
      expect(Scope.AgentProject).toBeDefined();
      expect(Scope.AgentProject as string).toBe('agent-project');
    });

    it('should be distinct from Project scope', () => {
      expect(Scope.AgentProject).not.toBe(Scope.Project);
    });
  });

  describe('AgentGlobal scope', () => {
    it('should have AgentGlobal value', () => {
      expect(Scope.AgentGlobal).toBeDefined();
      expect(Scope.AgentGlobal as string).toBe('agent-global');
    });

    it('should be distinct from Global scope', () => {
      expect(Scope.AgentGlobal).not.toBe(Scope.Global);
    });
  });

  describe('Scope enum completeness', () => {
    it('should have 6 total scope values (4 existing + 2 agent)', () => {
      const scopeValues = Object.values(Scope);
      expect(scopeValues).toHaveLength(6);
    });

    it('should include all existing scopes', () => {
      expect(Scope.Enterprise as string).toBe('enterprise');
      expect(Scope.Local as string).toBe('local');
      expect(Scope.Project as string).toBe('project');
      expect(Scope.Global as string).toBe('global');
    });

    it('should support type-safe enum member access', () => {
      const testScope: Scope = Scope.AgentProject;
      expect(testScope as string).toBe('agent-project');
    });
  });

  describe('Scope enum ordering', () => {
    it('should maintain logical hierarchy order in enum definition', () => {
      // Enum values maintain insertion order
      const scopeKeys = Object.keys(Scope).filter(k => isNaN(Number(k)));

      // Expected order: Enterprise, Local, Project, Global, AgentProject, AgentGlobal
      expect(scopeKeys[0]).toBe('Enterprise');
      expect(scopeKeys[1]).toBe('Local');
      expect(scopeKeys[2]).toBe('Project');
      expect(scopeKeys[3]).toBe('Global');
      expect(scopeKeys[4]).toBe('AgentProject');
      expect(scopeKeys[5]).toBe('AgentGlobal');
    });
  });
});
