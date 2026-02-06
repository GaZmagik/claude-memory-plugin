/**
 * Unit tests for hooks/src/core/types.ts
 *
 * Tests the HookInput interface, including the agent_context placeholder
 * for future agent identity injection.
 */

import { describe, it, expect } from 'vitest';
import { Readable } from 'stream';
import { parseHookInput } from './stdin.js';
import type { HookInput, AgentContext } from './types.js';
import { EXIT_ALLOW, EXIT_WARN, EXIT_BLOCK } from './types.js';

describe('HookInput types', () => {
  describe('agent_context field', () => {
    it('should accept HookInput with agent_context populated', async () => {
      const input: HookInput = {
        hook_event_name: 'PostToolUse:Bash',
        tool_name: 'Bash',
        session_id: 'test-session',
        cwd: '/home/user/project',
        agent_context: {
          agent_name: 'typescript-pro',
          source: 'flag',
        },
      };

      const stream = Readable.from([JSON.stringify(input)]);
      const result = await parseHookInput(stream);

      expect(result).toEqual(input);
      expect((result as HookInput).agent_context).toBeDefined();
      expect((result as HookInput).agent_context!.agent_name).toBe('typescript-pro');
      expect((result as HookInput).agent_context!.source).toBe('flag');
    });

    it('should accept HookInput without agent_context (backward compatible)', async () => {
      const input: HookInput = {
        hook_event_name: 'PostToolUse:Read',
        tool_name: 'Read',
        session_id: 'test-session',
        cwd: '/home/user',
      };

      const stream = Readable.from([JSON.stringify(input)]);
      const result = await parseHookInput(stream);

      expect(result).toEqual(input);
      expect((result as HookInput).agent_context).toBeUndefined();
    });

    it('should preserve all agent_context fields through serialisation', async () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse:Write',
        tool_name: 'Write',
        session_id: 'sess-123',
        cwd: '/project',
        agent_context: {
          agent_name: 'rust-expert',
          source: 'env',
          agent_type: 'code-review',
          parent_session_id: 'parent-sess-456',
        },
      };

      const stream = Readable.from([JSON.stringify(input)]);
      const result = await parseHookInput(stream);

      const ctx = (result as HookInput).agent_context!;
      expect(ctx.agent_name).toBe('rust-expert');
      expect(ctx.source).toBe('env');
      expect(ctx.agent_type).toBe('code-review');
      expect(ctx.parent_session_id).toBe('parent-sess-456');
    });

    it('should accept all valid source types', async () => {
      const sources: AgentContext['source'][] = [
        'flag',
        'hook-metadata',
        'env',
        'marker',
        'plugin-config',
      ];

      for (const source of sources) {
        const input: HookInput = {
          hook_event_name: 'PostToolUse:Bash',
          cwd: '/test',
          agent_context: {
            agent_name: 'test-agent',
            source,
          },
        };

        const stream = Readable.from([JSON.stringify(input)]);
        const result = await parseHookInput(stream);
        expect((result as HookInput).agent_context!.source).toBe(source);
      }
    });

    it('should handle agent_context with only required fields', async () => {
      const input: HookInput = {
        hook_event_name: 'SessionStart',
        cwd: '/project',
        agent_context: {
          agent_name: 'python-ml',
          source: 'marker',
        },
      };

      const stream = Readable.from([JSON.stringify(input)]);
      const result = await parseHookInput(stream);

      const ctx = (result as HookInput).agent_context!;
      expect(ctx.agent_name).toBe('python-ml');
      expect(ctx.source).toBe('marker');
      expect(ctx.agent_type).toBeUndefined();
      expect(ctx.parent_session_id).toBeUndefined();
    });
  });

  describe('exit code constants', () => {
    it('should export correct exit codes', () => {
      expect(EXIT_ALLOW).toBe(0);
      expect(EXIT_WARN).toBe(1);
      expect(EXIT_BLOCK).toBe(2);
    });
  });
});
