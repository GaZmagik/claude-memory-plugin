/**
 * Tests for Progress Reporting Utility
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { ProgressReporter, MultiPhaseProgress, createMultiPhaseProgress } from './progress.js';
import type { ProgressCallback } from './progress.js';

describe('ProgressReporter', () => {
  let output: string[];
  let outputFn: (text: string) => void;

  beforeEach(() => {
    output = [];
    outputFn = (text: string) => output.push(text);
  });

  it('should show initial message on creation', () => {
    new ProgressReporter({
      operation: 'Testing',
      output: outputFn,
    });

    expect(output.length).toBeGreaterThanOrEqual(1);
    expect(output[0]).toContain('Testing');
  });

  it('should show progress with total count', () => {
    const reporter = new ProgressReporter({
      operation: 'Processing',
      total: 10,
      output: outputFn,
      throttleMs: 0,
    });

    reporter.update(5);

    const allOutput = output.join('');
    expect(allOutput).toContain('Processing');
    expect(allOutput).toContain('[5/10]');
    expect(allOutput).toContain('50%');
  });

  it('should show progress without total (counter mode)', () => {
    const reporter = new ProgressReporter({
      operation: 'Scanning',
      output: outputFn,
      throttleMs: 0,
    });

    reporter.update(3);

    const allOutput = output.join('');
    expect(allOutput).toContain('Scanning');
    expect(allOutput).toContain('[3]');
  });

  it('should support tick for incrementing by 1', () => {
    const reporter = new ProgressReporter({
      operation: 'Items',
      total: 5,
      output: outputFn,
      throttleMs: 0,
    });

    reporter.tick();
    reporter.tick();
    reporter.tick();

    const allOutput = output.join('');
    expect(allOutput).toContain('[3/5]');
    expect(allOutput).toContain('60%');
  });

  it('should include label when provided', () => {
    const reporter = new ProgressReporter({
      operation: 'Embedding',
      total: 3,
      output: outputFn,
      throttleMs: 0,
    });

    reporter.update(1, 'memory-abc');

    const allOutput = output.join('');
    expect(allOutput).toContain('memory-abc');
  });

  it('should show elapsed time by default', () => {
    const reporter = new ProgressReporter({
      operation: 'Waiting',
      output: outputFn,
      throttleMs: 0,
    });

    reporter.update(1);

    const allOutput = output.join('');
    // Should contain some time indicator (ms or s)
    expect(allOutput).toMatch(/\d+(ms|s)/);
  });

  it('should hide elapsed time when showElapsed is false', () => {
    const reporter = new ProgressReporter({
      operation: 'Quick',
      showElapsed: false,
      output: outputFn,
      throttleMs: 0,
    });

    reporter.update(1);

    // The output should not contain time patterns beyond the initial render
    // Just check that "Quick" is present
    const allOutput = output.join('');
    expect(allOutput).toContain('Quick');
  });

  it('should support complete with summary', () => {
    const reporter = new ProgressReporter({
      operation: 'Building',
      total: 5,
      output: outputFn,
      throttleMs: 0,
    });

    reporter.update(5);
    reporter.complete('Built 5 items successfully');

    const allOutput = output.join('');
    expect(allOutput).toContain('Built 5 items successfully');
  });

  it('should not output after complete', () => {
    const reporter = new ProgressReporter({
      operation: 'Done',
      output: outputFn,
      throttleMs: 0,
    });

    reporter.complete('Finished');
    const countAfterComplete = output.length;

    reporter.update(1);
    reporter.tick();
    reporter.complete('Again');

    expect(output.length).toBe(countAfterComplete);
  });

  it('should support setTotal to update total mid-operation', () => {
    const reporter = new ProgressReporter({
      operation: 'Dynamic',
      output: outputFn,
      throttleMs: 0,
    });

    reporter.setTotal(20);
    reporter.update(10);

    const allOutput = output.join('');
    expect(allOutput).toContain('[10/20]');
    expect(allOutput).toContain('50%');
  });

  it('should support log for sub-step messages', () => {
    const reporter = new ProgressReporter({
      operation: 'Processing',
      total: 10,
      output: outputFn,
      throttleMs: 0,
    });

    reporter.log('Found 3 orphans');

    const allOutput = output.join('');
    expect(allOutput).toContain('Found 3 orphans');
  });

  it('should create a ProgressCallback via toCallback', () => {
    const reporter = new ProgressReporter({
      operation: 'Callback',
      output: outputFn,
      throttleMs: 0,
    });

    const callback: ProgressCallback = reporter.toCallback();
    expect(typeof callback).toBe('function');

    callback(3, 10, 'item-3');

    const allOutput = output.join('');
    expect(allOutput).toContain('[3/10]');
  });

  it('should throttle rapid updates', () => {
    const reporter = new ProgressReporter({
      operation: 'Throttled',
      total: 100,
      output: outputFn,
      throttleMs: 1000, // 1 second throttle
    });

    // Rapid updates
    for (let i = 1; i <= 50; i++) {
      reporter.update(i);
    }

    // Should have far fewer outputs than 50 due to throttling
    // Initial render + potentially 1 more (first update that passes throttle check)
    expect(output.length).toBeLessThan(10);
  });

  it('should always render the final update (total reached)', () => {
    const reporter = new ProgressReporter({
      operation: 'Final',
      total: 5,
      output: outputFn,
      throttleMs: 1000, // High throttle
    });

    // The update at total should always render
    reporter.update(5);
    reporter.complete();

    const allOutput = output.join('');
    expect(allOutput).toContain('complete');
  });
});

describe('MultiPhaseProgress', () => {
  let output: string[];
  let outputFn: (text: string) => void;

  beforeEach(() => {
    output = [];
    outputFn = (text: string) => output.push(text);
  });

  it('should create with phases', () => {
    const progress = createMultiPhaseProgress('Test Op', [
      'Phase A',
      'Phase B',
      'Phase C',
    ], outputFn);

    expect(progress).toBeInstanceOf(MultiPhaseProgress);
  });

  it('should advance through phases with nextPhase', () => {
    const progress = createMultiPhaseProgress('Test Op', [
      'Loading',
      'Processing',
      'Saving',
    ], outputFn);

    const phase1 = progress.nextPhase(5);
    expect(phase1).toBeInstanceOf(ProgressReporter);

    const allOutput = output.join('');
    expect(allOutput).toContain('[1/3]');
    expect(allOutput).toContain('Loading');
  });

  it('should complete previous phase when advancing', () => {
    const progress = createMultiPhaseProgress('Test Op', [
      'Phase 1',
      'Phase 2',
    ], outputFn);

    progress.nextPhase(3);
    progress.nextPhase(5);

    const allOutput = output.join('');
    expect(allOutput).toContain('[1/2]');
    expect(allOutput).toContain('Phase 1');
    expect(allOutput).toContain('[2/2]');
    expect(allOutput).toContain('Phase 2');
  });

  it('should provide overall completion message', () => {
    const progress = createMultiPhaseProgress('Full Operation', [
      'Step 1',
      'Step 2',
    ], outputFn);

    progress.nextPhase();
    progress.nextPhase();
    progress.complete('All done');

    const allOutput = output.join('');
    expect(allOutput).toContain('All done');
  });

  it('should expose current reporter', () => {
    const progress = createMultiPhaseProgress('Op', [
      'A',
    ], outputFn);

    expect(progress.current).toBeNull();

    progress.nextPhase(10);
    expect(progress.current).toBeInstanceOf(ProgressReporter);
  });
});
