/**
 * T026: Integration test for opt-in decision injection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

import { EnhancedInjector } from '../../hooks/src/memory/enhanced-injector.js';
import { parseInjectionConfig } from '../../hooks/src/settings/injection-settings.js';

describe('Opt-in Decision Injection', () => {
  let testDir: string;
  let configPath: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'decision-injection-'));
    configPath = path.join(testDir, '.claude', 'memory.local.md');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should include decisions when enabled', async () => {
    fs.writeFileSync(configPath, `---
injection:
  types:
    decision:
      enabled: true
---
`);
    const config = await parseInjectionConfig(configPath);
    const injector = new EnhancedInjector(config);

    const memories = [
      { id: 'decision-1', type: 'decision', title: 'Test', score: 0.5 },
    ];

    const filtered = injector.filterByConfig(memories);
    expect(filtered.length).toBe(1);
  });

  it('should respect decision threshold', async () => {
    fs.writeFileSync(configPath, `---
injection:
  types:
    decision:
      enabled: true
      threshold: 0.6
---
`);
    const config = await parseInjectionConfig(configPath);
    const injector = new EnhancedInjector(config);

    const memories = [
      { id: 'decision-1', type: 'decision', title: 'High', score: 0.8 },
      { id: 'decision-2', type: 'decision', title: 'Low', score: 0.4 },
    ];

    const filtered = injector.filterByThreshold(memories, 'Read');
    expect(filtered.map(m => m.id)).toEqual(['decision-1']);
  });

  it('should respect decision limit', async () => {
    fs.writeFileSync(configPath, `---
injection:
  types:
    decision:
      enabled: true
      limit: 2
---
`);
    const config = await parseInjectionConfig(configPath);
    const injector = new EnhancedInjector(config);

    const memories = [
      { id: 'd1', type: 'decision', title: 'T1', score: 0.9 },
      { id: 'd2', type: 'decision', title: 'T2', score: 0.8 },
      { id: 'd3', type: 'decision', title: 'T3', score: 0.7 },
    ];

    const limited = injector.applyLimits(memories);
    expect(limited.filter(m => m.type === 'decision').length).toBeLessThanOrEqual(2);
  });
});
