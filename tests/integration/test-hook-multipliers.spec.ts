/**
 * T028: Integration test for hook multipliers (Bash 1.2x, Edit/Write 0.8x)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

import { EnhancedInjector } from '../../hooks/src/memory/enhanced-injector.js';
import { parseInjectionConfig } from '../../hooks/src/settings/injection-settings.js';

describe('Hook Multipliers Integration', () => {
  let testDir: string;
  let configPath: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'hook-multipliers-'));
    configPath = path.join(testDir, '.claude', 'memory.local.md');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should apply Bash multiplier (1.2x) - stricter threshold', async () => {
    fs.writeFileSync(configPath, `---
injection:
  types:
    gotcha:
      enabled: true
      threshold: 0.3
---
`);
    const config = await parseInjectionConfig(configPath);
    const injector = new EnhancedInjector(config);

    const memories = [
      { id: 'g1', type: 'gotcha', title: 'T1', score: 0.35 }, // 0.35 < 0.36 (0.3*1.2), filtered
      { id: 'g2', type: 'gotcha', title: 'T2', score: 0.4 },  // 0.4 >= 0.36, kept
    ];

    const filtered = injector.filterByThreshold(memories, 'Bash');
    expect(filtered.map(m => m.id)).toEqual(['g2']);
  });

  it('should apply Edit multiplier (0.8x) - looser threshold', async () => {
    fs.writeFileSync(configPath, `---
injection:
  types:
    gotcha:
      enabled: true
      threshold: 0.4
---
`);
    const config = await parseInjectionConfig(configPath);
    const injector = new EnhancedInjector(config);

    const memories = [
      { id: 'g1', type: 'gotcha', title: 'T1', score: 0.35 }, // 0.35 >= 0.32 (0.4*0.8), kept
    ];

    const filtered = injector.filterByThreshold(memories, 'Edit');
    expect(filtered.length).toBe(1);
  });

  it('should use custom multipliers when specified', async () => {
    fs.writeFileSync(configPath, `---
injection:
  types:
    gotcha:
      enabled: true
      threshold: 0.5
  hook_multipliers:
    Bash: 2.0
---
`);
    const config = await parseInjectionConfig(configPath);
    const injector = new EnhancedInjector(config);

    // Effective threshold: 0.5 * 2.0 = 1.0
    const memories = [
      { id: 'g1', type: 'gotcha', title: 'T1', score: 0.9 },
    ];

    const filtered = injector.filterByThreshold(memories, 'Bash');
    expect(filtered.length).toBe(0); // score 0.9 < threshold 1.0
  });
});
