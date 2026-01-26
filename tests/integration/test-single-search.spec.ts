/**
 * T029: Integration test for single semantic search with client-side filtering
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { EnhancedInjector } from '../../hooks/src/memory/enhanced-injector.js';
import { DEFAULT_INJECTION_CONFIG } from '../../hooks/src/settings/injection-settings.js';

describe('Single Search with Client-Side Filtering', () => {
  it('should perform single search then filter by type', async () => {
    const config = {
      ...DEFAULT_INJECTION_CONFIG,
      types: {
        gotcha: { enabled: true, threshold: 0.2, limit: 5 },
        decision: { enabled: true, threshold: 0.35, limit: 3 },
        learning: { enabled: false, threshold: 0.4, limit: 2 },
      },
    };

    const injector = new EnhancedInjector(config);

    // Simulate search results (all types mixed)
    const searchResults = [
      { id: 'gotcha-1', type: 'gotcha', title: 'T', score: 0.8 },
      { id: 'decision-1', type: 'decision', title: 'T', score: 0.7 },
      { id: 'learning-1', type: 'learning', title: 'T', score: 0.9 },
      { id: 'gotcha-2', type: 'gotcha', title: 'T', score: 0.5 },
    ];

    // Filter by enabled types
    const filtered = injector.filterByConfig(searchResults);

    // Learning should be excluded (disabled)
    expect(filtered.map(m => m.type)).not.toContain('learning');
    expect(filtered.length).toBe(3);
  });

  it('should filter by threshold after type filtering', async () => {
    const config = {
      ...DEFAULT_INJECTION_CONFIG,
      types: {
        gotcha: { enabled: true, threshold: 0.6, limit: 5 },
        decision: { enabled: true, threshold: 0.6, limit: 3 },
        learning: { enabled: true, threshold: 0.6, limit: 2 },
      },
    };

    const injector = new EnhancedInjector(config);

    const searchResults = [
      { id: 'gotcha-1', type: 'gotcha', title: 'T', score: 0.8 },
      { id: 'gotcha-2', type: 'gotcha', title: 'T', score: 0.4 }, // Below threshold
      { id: 'decision-1', type: 'decision', title: 'T', score: 0.3 }, // Below threshold
    ];

    const filtered = injector.filterByThreshold(
      injector.filterByConfig(searchResults),
      'Read'
    );

    expect(filtered.length).toBe(1);
    expect(filtered[0]?.id).toBe('gotcha-1');
  });
});
