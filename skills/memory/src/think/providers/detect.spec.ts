/**
 * Co-located tests for detect.ts
 */
import { describe, it, expect } from 'vitest';
import { detectProvider, isProviderAvailable, getAvailableProviders } from './detect.js';

describe('detect exports', () => {
  it('exports detectProvider', () => expect(detectProvider).toBeDefined());
  it('exports isProviderAvailable', () => expect(isProviderAvailable).toBeDefined());
  it('exports getAvailableProviders', () => expect(getAvailableProviders).toBeDefined());
});
