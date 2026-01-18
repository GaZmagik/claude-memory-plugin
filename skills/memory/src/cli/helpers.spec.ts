/**
 * Tests for CLI helpers module
 */

import { describe, expect, it } from 'bun:test';
import { parseScope, parseMemoryType, getGlobalMemoryPath } from './helpers.js';
import { Scope, MemoryType } from '../types/enums.js';

describe('CLI Helpers', () => {
  describe('parseScope', () => {
    it('should parse "global" to Scope.Global', () => {
      expect(parseScope('global')).toBe(Scope.Global);
    });

    it('should parse "user" to Scope.Global (alias)', () => {
      expect(parseScope('user')).toBe(Scope.Global);
    });

    it('should parse "project" to Scope.Project', () => {
      expect(parseScope('project')).toBe(Scope.Project);
    });

    it('should parse "local" to Scope.Local', () => {
      expect(parseScope('local')).toBe(Scope.Local);
    });

    it('should parse "enterprise" to Scope.Enterprise', () => {
      expect(parseScope('enterprise')).toBe(Scope.Enterprise);
    });

    it('should default to Scope.Project for undefined', () => {
      expect(parseScope(undefined)).toBe(Scope.Project);
    });

    it('should default to Scope.Project for unknown values', () => {
      expect(parseScope('unknown')).toBe(Scope.Project);
    });

    it('should be case-insensitive', () => {
      expect(parseScope('GLOBAL')).toBe(Scope.Global);
      expect(parseScope('Local')).toBe(Scope.Local);
    });
  });

  describe('parseMemoryType', () => {
    it('should parse "decision" to MemoryType.Decision', () => {
      expect(parseMemoryType('decision')).toBe(MemoryType.Decision);
    });

    it('should parse "learning" to MemoryType.Learning', () => {
      expect(parseMemoryType('learning')).toBe(MemoryType.Learning);
    });

    it('should parse "artifact" to MemoryType.Artifact', () => {
      expect(parseMemoryType('artifact')).toBe(MemoryType.Artifact);
    });

    it('should parse "gotcha" to MemoryType.Gotcha', () => {
      expect(parseMemoryType('gotcha')).toBe(MemoryType.Gotcha);
    });

    it('should parse "breadcrumb" to MemoryType.Breadcrumb', () => {
      expect(parseMemoryType('breadcrumb')).toBe(MemoryType.Breadcrumb);
    });

    it('should parse "hub" to MemoryType.Hub', () => {
      expect(parseMemoryType('hub')).toBe(MemoryType.Hub);
    });

    it('should return undefined for undefined input', () => {
      expect(parseMemoryType(undefined)).toBeUndefined();
    });

    it('should return undefined for unknown values', () => {
      expect(parseMemoryType('unknown')).toBeUndefined();
    });

    it('should be case-insensitive', () => {
      expect(parseMemoryType('DECISION')).toBe(MemoryType.Decision);
      expect(parseMemoryType('Learning')).toBe(MemoryType.Learning);
    });
  });

  describe('getGlobalMemoryPath', () => {
    it('should return a path ending with .claude/memory', () => {
      const result = getGlobalMemoryPath();
      expect(result).toMatch(/\.claude\/memory$/);
    });
  });
});
