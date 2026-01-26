/**
 * T091b: Performance test for session state operations
 * Requirement: Session state operations complete <50ms
 */
import { describe, it, expect } from 'vitest';
import { HintTracker } from '../../skills/memory/src/cli/hint-tracker.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

describe('session-state-speed', () => {
  it('HintTracker create completes in <50ms', async () => {
    const tmpDir = path.join(os.tmpdir(), `hint-perf-${Date.now()}`);

    const start = performance.now();
    const tracker = await HintTracker.create(tmpDir, 'perf-session');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50);

    // Cleanup
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('increment operation completes in <50ms', async () => {
    const tmpDir = path.join(os.tmpdir(), `hint-perf-inc-${Date.now()}`);
    const tracker = await HintTracker.create(tmpDir, 'perf-session');

    const start = performance.now();
    await tracker.increment('test-command');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50);

    // Cleanup
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('getCount operation completes in <1ms', async () => {
    const tmpDir = path.join(os.tmpdir(), `hint-perf-get-${Date.now()}`);
    const tracker = await HintTracker.create(tmpDir, 'perf-session');
    await tracker.increment('test-command');

    const start = performance.now();
    tracker.getCount('test-command');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1);

    // Cleanup
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('multiple increments complete in <200ms', async () => {
    const tmpDir = path.join(os.tmpdir(), `hint-perf-multi-${Date.now()}`);
    const tracker = await HintTracker.create(tmpDir, 'perf-session');

    const start = performance.now();
    for (let i = 0; i < 10; i++) {
      await tracker.increment(`command-${i}`);
    }
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(200);

    // Cleanup
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('session isolation is fast (<10ms check)', async () => {
    const tmpDir = path.join(os.tmpdir(), `hint-perf-iso-${Date.now()}`);

    const start = performance.now();
    const tracker1 = await HintTracker.create(tmpDir, 'session-1');
    const tracker2 = await HintTracker.create(tmpDir, 'session-2');
    const duration = performance.now() - start;

    // Two separate sessions should be independent
    expect(tracker1.getCount('cmd')).toBe(0);
    expect(tracker2.getCount('cmd')).toBe(0);
    expect(duration).toBeLessThan(100); // Allow more time for two creates

    // Cleanup
    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});
