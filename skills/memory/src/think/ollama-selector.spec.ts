/**
 * Co-located tests - main tests in tests/unit/think/
 */
import { describe, it, expect } from 'vitest';
import { buildSelectionPrompt, parseSelectionResponse } from './ollama-selector.js';

describe('ollama-selector exports', () => {
  it('exports buildSelectionPrompt', () => expect(buildSelectionPrompt).toBeDefined());
  it('exports parseSelectionResponse', () => expect(parseSelectionResponse).toBeDefined());
});
