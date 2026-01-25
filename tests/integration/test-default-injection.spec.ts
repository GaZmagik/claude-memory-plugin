/**
 * T025: Integration test for default config (backward compatibility - gotchas only)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

// Import will fail until implementation exists (TDD Red phase)
import { EnhancedInjector } from '../../hooks/src/memory/enhanced-injector.js';
import { parseInjectionConfig, DEFAULT_INJECTION_CONFIG } from '../../hooks/src/settings/injection-settings.js';

describe('Default Injection Config (Backward Compatibility)', () => {
  let testDir: string;
  let injector: EnhancedInjector;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'default-injection-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should inject only gotchas when no config file exists', async () => {
    const config = await parseInjectionConfig(path.join(testDir, 'nonexistent.md'));
    injector = new EnhancedInjector(config);

    expect(config.types.gotcha.enabled).toBe(true);
    expect(config.types.decision.enabled).toBe(false);
    expect(config.types.learning.enabled).toBe(false);
  });

  it('should use default thresholds when no config specified', async () => {
    const config = await parseInjectionConfig(path.join(testDir, 'nonexistent.md'));

    expect(config.types.gotcha.threshold).toBe(0.2);
    expect(config.types.decision.threshold).toBe(0.35);
    expect(config.types.learning.threshold).toBe(0.4);
  });

  it('should use default hook multipliers', async () => {
    const config = await parseInjectionConfig(path.join(testDir, 'nonexistent.md'));

    expect(config.hook_multipliers).toEqual({
      Read: 1.0,
      Edit: 0.8,
      Write: 0.8,
      Bash: 1.2,
    });
  });

  it('should filter out decisions and learnings from results', async () => {
    const config = DEFAULT_INJECTION_CONFIG;
    injector = new EnhancedInjector(config);

    const memories = [
      { id: 'gotcha-1', type: 'gotcha', title: 'Test', score: 0.8 },
      { id: 'decision-1', type: 'decision', title: 'Test', score: 0.8 },
      { id: 'learning-1', type: 'learning', title: 'Test', score: 0.8 },
    ];

    const filtered = injector.filterByConfig(memories);

    expect(filtered.map(m => m.type)).toEqual(['gotcha']);
  });
});
