/**
 * T027: Integration test for opt-in learning injection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

import { EnhancedInjector } from '../../hooks/src/memory/enhanced-injector.js';
import { parseInjectionConfig } from '../../hooks/src/settings/injection-settings.js';

describe('Opt-in Learning Injection', () => {
  let testDir: string;
  let configPath: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'learning-injection-'));
    configPath = path.join(testDir, '.claude', 'memory.local.md');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should include learnings when enabled', async () => {
    fs.writeFileSync(configPath, `---
injection:
  types:
    learning:
      enabled: true
---
`);
    const config = await parseInjectionConfig(configPath);
    const injector = new EnhancedInjector(config);

    const memories = [
      { id: 'learning-1', type: 'learning', title: 'Test', score: 0.6 },
    ];

    const filtered = injector.filterByConfig(memories);
    expect(filtered.length).toBe(1);
  });

  it('should use higher default threshold for learnings (0.4)', async () => {
    const config = await parseInjectionConfig(path.join(testDir, 'nonexistent.md'));
    expect(config.types.learning.threshold).toBe(0.4);
  });

  it('should use lower default limit for learnings (2)', async () => {
    const config = await parseInjectionConfig(path.join(testDir, 'nonexistent.md'));
    expect(config.types.learning.limit).toBe(2);
  });
});
