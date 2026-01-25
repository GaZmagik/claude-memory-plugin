/**
 * Co-located tests for commands.ts
 */
import { describe, it, expect } from 'vitest';
import { buildClaudeCommand, buildCodexCommand, buildGeminiCommand } from './commands.js';

describe('commands exports', () => {
  it('exports buildClaudeCommand', () => expect(buildClaudeCommand).toBeDefined());
  it('exports buildCodexCommand', () => expect(buildCodexCommand).toBeDefined());
  it('exports buildGeminiCommand', () => expect(buildGeminiCommand).toBeDefined());
});
