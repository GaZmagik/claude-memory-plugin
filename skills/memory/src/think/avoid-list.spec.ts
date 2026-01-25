/**
 * Co-located tests for avoid-list
 */
import { describe, it, expect } from 'vitest';
import { extractAvoidList } from './avoid-list.js';

describe('avoid-list exports', () => {
  it('exports extractAvoidList', () => expect(extractAvoidList).toBeDefined());
});
