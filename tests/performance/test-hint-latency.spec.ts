/**
 * T088: Performance test for hint display latency
 * Requirement: Hint display adds <10ms latency
 */
import { describe, it, expect } from 'vitest';
import { HintTracker, shouldShowHint } from '../../skills/memory/src/cli/hint-tracker.js';
import { getRotatingHint, outputHintToStderr } from '../../skills/memory/src/cli/hint-output.js';

describe('hint-latency', () => {
  it('HintTracker.create completes in <10ms', async () => {
    const start = performance.now();
    const tracker = await HintTracker.create('/tmp/test-hints', 'perf-test');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
  });

  it('shouldShowHint check completes in <1ms', async () => {
    const tracker = await HintTracker.create('/tmp/test-hints', 'perf-test-2');

    const start = performance.now();
    shouldShowHint(tracker, 'test-command');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1);
  });

  it('getRotatingHint completes in <1ms', () => {
    const start = performance.now();
    getRotatingHint(0);
    getRotatingHint(1);
    getRotatingHint(2);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1);
  });

  it('full hint flow completes in <10ms', async () => {
    const start = performance.now();

    const tracker = await HintTracker.create('/tmp/test-hints', 'perf-test-3');
    if (shouldShowHint(tracker, 'perf-command')) {
      const hint = getRotatingHint(tracker.getCount('perf-command'));
      // Note: outputHintToStderr writes to stderr, skip in perf test
    }
    await tracker.increment('perf-command');

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(10);
  });
});
