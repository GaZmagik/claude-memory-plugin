/**
 * Tests for Agent Detection
 */

import { describe, it, expect } from 'vitest';
import { detectAgent, extractSubagentType } from './detect-agent.js';

describe('detectAgent', () => {
  describe('Priority 1: --agent flag in args', () => {
    it('detects agent from --agent flag with space separator', () => {
      const result = detectAgent('--agent typescript-expert');
      expect(result.detected).toBe(true);
      expect(result.name).toBe('typescript-expert');
      expect(result.source).toBe('args');
    });

    it('detects agent from --agent flag with equals separator', () => {
      const result = detectAgent('--agent=rust-expert');
      expect(result.detected).toBe(true);
      expect(result.name).toBe('rust-expert');
      expect(result.source).toBe('args');
    });

    it('detects agent from --agent flag with quoted value', () => {
      const result = detectAgent('--agent="security-reviewer"');
      expect(result.detected).toBe(true);
      expect(result.name).toBe('security-reviewer');
      expect(result.source).toBe('args');
    });

    it('detects agent in middle of other arguments', () => {
      const result = detectAgent('--threshold 0.7 --agent test-agent --auto-link');
      expect(result.detected).toBe(true);
      expect(result.name).toBe('test-agent');
      expect(result.source).toBe('args');
    });

    it('handles agent names with numbers', () => {
      const result = detectAgent('--agent agent-v2');
      expect(result.detected).toBe(true);
      expect(result.name).toBe('agent-v2');
      expect(result.source).toBe('args');
    });

    it('handles mixed case agent names', () => {
      const result = detectAgent('--agent TypeScript-Expert');
      expect(result.detected).toBe(true);
      expect(result.name).toBe('TypeScript-Expert');
      expect(result.source).toBe('args');
    });

    it('handles agent names with underscores', () => {
      const result = detectAgent('--agent test_agent');
      expect(result.detected).toBe(true);
      expect(result.name).toBe('test_agent');
      expect(result.source).toBe('args');
    });

    it('handles complex agent names with mixed case, numbers, underscores, and hyphens', () => {
      const result = detectAgent('--agent TypeScript_Expert-v2');
      expect(result.detected).toBe(true);
      expect(result.name).toBe('TypeScript_Expert-v2');
      expect(result.source).toBe('args');
    });

    it('handles --agent with equals and no quotes', () => {
      const result = detectAgent('--agent=test-agent');
      expect(result.detected).toBe(true);
      expect(result.name).toBe('test-agent');
      expect(result.source).toBe('args');
    });

    it('handles --agent with space and no quotes', () => {
      const result = detectAgent('--agent test-agent');
      expect(result.detected).toBe(true);
      expect(result.name).toBe('test-agent');
      expect(result.source).toBe('args');
    });
  });

  describe('Priority 2: CLAUDE_AGENT_NAME environment variable', () => {
    it('detects agent from environment variable when no args', () => {
      const result = detectAgent(undefined, { CLAUDE_AGENT_NAME: 'env-agent' });
      expect(result.detected).toBe(true);
      expect(result.name).toBe('env-agent');
      expect(result.source).toBe('env');
    });

    it('detects agent from environment variable when args present but no --agent flag', () => {
      const result = detectAgent('--threshold 0.7', { CLAUDE_AGENT_NAME: 'env-agent' });
      expect(result.detected).toBe(true);
      expect(result.name).toBe('env-agent');
      expect(result.source).toBe('env');
    });

    it('trims whitespace from environment variable', () => {
      const result = detectAgent(undefined, { CLAUDE_AGENT_NAME: '  env-agent  ' });
      expect(result.detected).toBe(true);
      expect(result.name).toBe('env-agent');
      expect(result.source).toBe('env');
    });

    it('ignores empty environment variable', () => {
      const result = detectAgent(undefined, { CLAUDE_AGENT_NAME: '   ' });
      expect(result.detected).toBe(false);
    });
  });

  describe('Priority order', () => {
    it('prefers --agent flag over environment variable', () => {
      const result = detectAgent(
        '--agent args-agent',
        { CLAUDE_AGENT_NAME: 'env-agent' }
      );
      expect(result.detected).toBe(true);
      expect(result.name).toBe('args-agent');
      expect(result.source).toBe('args');
    });
  });

  describe('No detection', () => {
    it('returns not detected when no sources available', () => {
      const result = detectAgent();
      expect(result.detected).toBe(false);
      expect(result.name).toBeUndefined();
      expect(result.source).toBeUndefined();
    });

    it('returns not detected when args present but no --agent flag', () => {
      const result = detectAgent('--threshold 0.7 --auto-link');
      expect(result.detected).toBe(false);
    });

    it('returns not detected when environment variable not set', () => {
      const result = detectAgent(undefined, {});
      expect(result.detected).toBe(false);
    });
  });
});

describe('extractSubagentType', () => {
  it('extracts subagent_type from double-quoted value', () => {
    const result = extractSubagentType('{"subagent_type": "typescript-expert"}');
    expect(result).toBe('typescript-expert');
  });

  it('extracts subagent_type from single-quoted value', () => {
    const result = extractSubagentType("{'subagent_type': 'rust-expert'}");
    expect(result).toBe('rust-expert');
  });

  it('extracts subagent_type with colon separator', () => {
    const result = extractSubagentType('subagent_type:"security-reviewer"');
    expect(result).toBe('security-reviewer');
  });

  it('handles complex args with multiple fields', () => {
    const result = extractSubagentType(
      '{"description": "Test task", "subagent_type": "test-agent", "prompt": "Do work"}'
    );
    expect(result).toBe('test-agent');
  });

  it('returns undefined when no subagent_type present', () => {
    const result = extractSubagentType('{"prompt": "Do work"}');
    expect(result).toBeUndefined();
  });

  it('returns undefined when args is undefined', () => {
    const result = extractSubagentType(undefined);
    expect(result).toBeUndefined();
  });
});
