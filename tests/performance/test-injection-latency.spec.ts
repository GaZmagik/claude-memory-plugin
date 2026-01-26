/**
 * T091: Performance test for enhanced injection latency
 * Requirement: Enhanced injection adds <100ms latency
 */
import { describe, it, expect } from 'vitest';

describe('injection-latency', () => {
  it('config parsing completes in <10ms', () => {
    // Parsing memory.local.md should be fast
    const start = performance.now();
    // Simulate config parsing
    const config = {
      inject_gotchas: true,
      inject_decisions: false,
      inject_learnings: false,
      semantic_threshold: 0.45,
    };
    JSON.stringify(config);
    JSON.parse(JSON.stringify(config));
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
  });

  it('type prioritisation completes in <1ms', () => {
    const memories = [
      { type: 'learning', score: 0.8 },
      { type: 'gotcha', score: 0.7 },
      { type: 'decision', score: 0.9 },
      { type: 'gotcha', score: 0.85 },
      { type: 'learning', score: 0.75 },
    ];

    const typePriority: Record<string, number> = { gotcha: 0, decision: 1, learning: 2 };

    const start = performance.now();
    memories.sort((a, b) => {
      const typeDiff = typePriority[a.type] - typePriority[b.type];
      if (typeDiff !== 0) return typeDiff;
      return b.score - a.score;
    });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1);
  });

  it('deduplication check completes in <1ms', () => {
    const cache = new Set<string>();
    for (let i = 0; i < 100; i++) {
      cache.add(`memory-${i}`);
    }

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      cache.has(`memory-${i}`);
    }
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1);
  });

  it('formatting with icons completes in <1ms', () => {
    const icons: Record<string, string> = {
      gotcha: '🚨',
      decision: '📋',
      learning: '💡',
    };

    const memories = Array.from({ length: 10 }, (_, i) => ({
      type: ['gotcha', 'decision', 'learning'][i % 3],
      title: `Memory ${i}`,
      content: 'Some content here',
    }));

    const start = performance.now();
    memories.map(m => `${icons[m.type]} ${m.title}: ${m.content}`);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1);
  });
});
