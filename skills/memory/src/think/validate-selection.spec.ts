/**
 * Co-located tests - main tests in tests/unit/think/
 */
import { describe, it, expect } from 'vitest';
import { validateSelection } from './validate-selection.js';

describe('validate-selection exports', () => {
  it('exports validateSelection', () => expect(validateSelection).toBeDefined());
});
