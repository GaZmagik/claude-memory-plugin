/**
 * Co-located tests for codex-parser.ts
 */
import { describe, it, expect } from 'vitest';
import { parseCodexOutput } from './codex-parser.js';

describe('codex-parser exports', () => {
  it('exports parseCodexOutput', () => expect(parseCodexOutput).toBeDefined());
});
