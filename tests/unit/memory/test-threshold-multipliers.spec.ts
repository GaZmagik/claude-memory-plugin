/**
 * T022: Unit test for per-type threshold calculation with multipliers
 */

import { describe, it, expect } from 'vitest';

// Import will fail until implementation exists (TDD Red phase)
import {
  calculateEffectiveThreshold,
  type HookType,
} from '../../../hooks/src/memory/enhanced-injector.js';

describe('Threshold Multipliers', () => {
  describe('calculateEffectiveThreshold()', () => {
    it('should return base threshold when multiplier is 1.0', () => {
      const result = calculateEffectiveThreshold(0.35, 'Read', { Read: 1.0, Edit: 0.8, Write: 0.8, Bash: 1.2 });
      expect(result).toBe(0.35);
    });

    it('should lower threshold for Edit hook (0.8 multiplier)', () => {
      // 0.35 * 0.8 = 0.28
      const result = calculateEffectiveThreshold(0.35, 'Edit', { Read: 1.0, Edit: 0.8, Write: 0.8, Bash: 1.2 });
      expect(result).toBeCloseTo(0.28);
    });

    it('should raise threshold for Bash hook (1.2 multiplier)', () => {
      // 0.35 * 1.2 = 0.42
      const result = calculateEffectiveThreshold(0.35, 'Bash', { Read: 1.0, Edit: 0.8, Write: 0.8, Bash: 1.2 });
      expect(result).toBeCloseTo(0.42);
    });

    it('should handle custom multipliers', () => {
      const result = calculateEffectiveThreshold(0.2, 'Bash', { Read: 1.0, Edit: 0.7, Write: 0.7, Bash: 1.5 });
      expect(result).toBeCloseTo(0.3); // 0.2 * 1.5
    });

    it('should clamp effective threshold to max 1.0', () => {
      const result = calculateEffectiveThreshold(0.8, 'Bash', { Read: 1.0, Edit: 0.8, Write: 0.8, Bash: 2.0 });
      expect(result).toBeLessThanOrEqual(1.0);
    });

    it('should handle zero base threshold', () => {
      const result = calculateEffectiveThreshold(0, 'Bash', { Read: 1.0, Edit: 0.8, Write: 0.8, Bash: 1.2 });
      expect(result).toBe(0);
    });
  });
});
