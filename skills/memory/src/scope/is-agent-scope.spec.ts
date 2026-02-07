/**
 * Tests for is-agent-scope utility
 */

import { describe, it, expect } from 'vitest';
import { isAgentScope } from './is-agent-scope.js';
import { Scope } from '../types/enums.js';

describe('isAgentScope', () => {
  describe('agent scopes', () => {
    it('returns true for Scope.AgentProject', () => {
      expect(isAgentScope(Scope.AgentProject)).toBe(true);
    });

    it('returns true for Scope.AgentGlobal', () => {
      expect(isAgentScope(Scope.AgentGlobal)).toBe(true);
    });
  });

  describe('regular scopes', () => {
    it('returns false for Scope.Project', () => {
      expect(isAgentScope(Scope.Project)).toBe(false);
    });

    it('returns false for Scope.Global', () => {
      expect(isAgentScope(Scope.Global)).toBe(false);
    });

    it('returns false for Scope.Local', () => {
      expect(isAgentScope(Scope.Local)).toBe(false);
    });

    it('returns false for Scope.Enterprise', () => {
      expect(isAgentScope(Scope.Enterprise)).toBe(false);
    });
  });
});
