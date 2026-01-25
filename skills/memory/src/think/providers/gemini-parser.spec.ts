/**
 * Co-located tests for gemini-parser.ts
 */
import { describe, it, expect } from 'vitest';
import { parseGeminiOutput } from './gemini-parser.js';

describe('gemini-parser exports', () => {
  it('exports parseGeminiOutput', () => expect(parseGeminiOutput).toBeDefined());
});
