/**
 * T021: Unit test for InjectionConfig parsing from memory.local.md
 *
 * Tests parsing of injection configuration from YAML frontmatter,
 * including defaults, validation, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

// These imports will fail until implementation exists (TDD Red phase)
import {
  parseInjectionConfig,
  DEFAULT_INJECTION_CONFIG,
  type InjectionConfig,
  type TypeConfig,
} from '../../../hooks/src/settings/injection-settings.js';

describe('InjectionConfig Parsing', () => {
  let testDir: string;
  let configPath: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'injection-config-'));
    configPath = path.join(testDir, '.claude', 'memory.local.md');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('DEFAULT_INJECTION_CONFIG', () => {
    it('should have correct default structure', () => {
      expect(DEFAULT_INJECTION_CONFIG).toMatchObject({
        enabled: true,
        types: {
          gotcha: { enabled: true, threshold: 0.2, limit: 5 },
          decision: { enabled: false, threshold: 0.35, limit: 3 },
          learning: { enabled: false, threshold: 0.4, limit: 2 },
        },
        hook_multipliers: {
          Read: 1.0,
          Edit: 0.8,
          Write: 0.8,
          Bash: 1.2,
        },
      });
    });

    it('should have gotcha enabled by default (backward compatibility)', () => {
      expect(DEFAULT_INJECTION_CONFIG.types.gotcha.enabled).toBe(true);
    });

    it('should have decision disabled by default (opt-in)', () => {
      expect(DEFAULT_INJECTION_CONFIG.types.decision.enabled).toBe(false);
    });

    it('should have learning disabled by default (opt-in)', () => {
      expect(DEFAULT_INJECTION_CONFIG.types.learning.enabled).toBe(false);
    });
  });

  describe('parseInjectionConfig() - file not found', () => {
    it('should return defaults when config file does not exist', async () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist.md');
      const config = await parseInjectionConfig(nonExistentPath);

      expect(config).toEqual(DEFAULT_INJECTION_CONFIG);
    });

    it('should not throw when file does not exist', async () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist.md');

      await expect(parseInjectionConfig(nonExistentPath)).resolves.toBeDefined();
    });
  });

  describe('parseInjectionConfig() - valid YAML', () => {
    it('should parse full injection config', async () => {
      const yaml = `---
injection:
  enabled: true
  types:
    gotcha:
      enabled: true
      threshold: 0.25
      limit: 4
    decision:
      enabled: true
      threshold: 0.4
      limit: 2
    learning:
      enabled: true
      threshold: 0.5
      limit: 1
  hook_multipliers:
    Read: 1.1
    Edit: 0.7
    Write: 0.9
    Bash: 1.5
---
# Config file
`;
      fs.writeFileSync(configPath, yaml);

      const config = await parseInjectionConfig(configPath);

      expect(config.enabled).toBe(true);
      expect(config.types.gotcha).toEqual({ enabled: true, threshold: 0.25, limit: 4 });
      expect(config.types.decision).toEqual({ enabled: true, threshold: 0.4, limit: 2 });
      expect(config.types.learning).toEqual({ enabled: true, threshold: 0.5, limit: 1 });
      expect(config.hook_multipliers).toEqual({ Read: 1.1, Edit: 0.7, Write: 0.9, Bash: 1.5 });
    });

    it('should merge partial config with defaults', async () => {
      const yaml = `---
injection:
  types:
    decision:
      enabled: true
---
`;
      fs.writeFileSync(configPath, yaml);

      const config = await parseInjectionConfig(configPath);

      // Specified value
      expect(config.types.decision.enabled).toBe(true);
      // Defaults for unspecified
      expect(config.types.decision.threshold).toBe(0.35);
      expect(config.types.decision.limit).toBe(3);
      expect(config.types.gotcha).toEqual(DEFAULT_INJECTION_CONFIG.types.gotcha);
      expect(config.types.learning).toEqual(DEFAULT_INJECTION_CONFIG.types.learning);
    });

    it('should use defaults when injection section is empty', async () => {
      const yaml = `---
enabled: true
ollama_host: http://localhost:11434
---
`;
      fs.writeFileSync(configPath, yaml);

      const config = await parseInjectionConfig(configPath);

      expect(config).toEqual(DEFAULT_INJECTION_CONFIG);
    });

    it('should parse config with master switch disabled', async () => {
      const yaml = `---
injection:
  enabled: false
---
`;
      fs.writeFileSync(configPath, yaml);

      const config = await parseInjectionConfig(configPath);

      expect(config.enabled).toBe(false);
      // Other defaults still apply
      expect(config.types).toEqual(DEFAULT_INJECTION_CONFIG.types);
    });
  });

  describe('parseInjectionConfig() - validation', () => {
    it('should clamp threshold below 0.0 to 0.0', async () => {
      const yaml = `---
injection:
  types:
    gotcha:
      threshold: -0.5
---
`;
      fs.writeFileSync(configPath, yaml);

      const config = await parseInjectionConfig(configPath);

      expect(config.types.gotcha.threshold).toBe(0.0);
    });

    it('should clamp threshold above 1.0 to 1.0', async () => {
      const yaml = `---
injection:
  types:
    gotcha:
      threshold: 1.5
---
`;
      fs.writeFileSync(configPath, yaml);

      const config = await parseInjectionConfig(configPath);

      expect(config.types.gotcha.threshold).toBe(1.0);
    });

    it('should set limit below 1 to 1', async () => {
      const yaml = `---
injection:
  types:
    gotcha:
      limit: 0
---
`;
      fs.writeFileSync(configPath, yaml);

      const config = await parseInjectionConfig(configPath);

      expect(config.types.gotcha.limit).toBe(1);
    });

    it('should use default for non-numeric threshold', async () => {
      const yaml = `---
injection:
  types:
    gotcha:
      threshold: "high"
---
`;
      fs.writeFileSync(configPath, yaml);

      const config = await parseInjectionConfig(configPath);

      expect(config.types.gotcha.threshold).toBe(0.2); // Default
    });

    it('should use default for non-boolean enabled', async () => {
      const yaml = `---
injection:
  types:
    gotcha:
      enabled: "yes"
---
`;
      fs.writeFileSync(configPath, yaml);

      const config = await parseInjectionConfig(configPath);

      expect(config.types.gotcha.enabled).toBe(true); // Default
    });

    it('should accept multipliers outside recommended range with no error', async () => {
      const yaml = `---
injection:
  hook_multipliers:
    Bash: 3.0
---
`;
      fs.writeFileSync(configPath, yaml);

      const config = await parseInjectionConfig(configPath);

      // Accept value but it's outside recommended 0.5-2.0
      expect(config.hook_multipliers.Bash).toBe(3.0);
    });

    it('should use default for non-numeric multiplier', async () => {
      const yaml = `---
injection:
  hook_multipliers:
    Read: "strict"
---
`;
      fs.writeFileSync(configPath, yaml);

      const config = await parseInjectionConfig(configPath);

      expect(config.hook_multipliers.Read).toBe(1.0); // Default
    });

    it('should round non-integer limit down', async () => {
      const yaml = `---
injection:
  types:
    gotcha:
      limit: 3.7
---
`;
      fs.writeFileSync(configPath, yaml);

      const config = await parseInjectionConfig(configPath);

      expect(config.types.gotcha.limit).toBe(3);
    });
  });

  describe('parseInjectionConfig() - error handling', () => {
    it('should return defaults for invalid YAML', async () => {
      const invalidYaml = `---
injection:
  types:
    gotcha: [this is invalid yaml structure
---
`;
      fs.writeFileSync(configPath, invalidYaml);

      const config = await parseInjectionConfig(configPath);

      expect(config).toEqual(DEFAULT_INJECTION_CONFIG);
    });

    it('should return defaults for malformed frontmatter', async () => {
      const malformed = `---
injection:
  enabled: true
# Missing closing ---
Content here
`;
      fs.writeFileSync(configPath, malformed);

      const config = await parseInjectionConfig(configPath);

      // Should gracefully handle malformed frontmatter
      expect(config).toBeDefined();
    });

    it('should ignore unknown fields without error', async () => {
      const yaml = `---
injection:
  enabled: true
  unknown_field: "should be ignored"
  types:
    gotcha:
      enabled: true
      future_option: 42
---
`;
      fs.writeFileSync(configPath, yaml);

      const config = await parseInjectionConfig(configPath);

      expect(config.enabled).toBe(true);
      expect(config.types.gotcha.enabled).toBe(true);
      // Unknown fields ignored
      expect((config as Record<string, unknown>).unknown_field).toBeUndefined();
    });
  });

  describe('parseInjectionConfig() - edge cases', () => {
    it('should handle empty file', async () => {
      fs.writeFileSync(configPath, '');

      const config = await parseInjectionConfig(configPath);

      expect(config).toEqual(DEFAULT_INJECTION_CONFIG);
    });

    it('should handle file with only markdown content (no frontmatter)', async () => {
      fs.writeFileSync(configPath, '# Just a heading\n\nSome content.');

      const config = await parseInjectionConfig(configPath);

      expect(config).toEqual(DEFAULT_INJECTION_CONFIG);
    });

    it('should handle null values in YAML', async () => {
      const yaml = `---
injection:
  enabled: null
  types:
    gotcha:
      threshold: null
---
`;
      fs.writeFileSync(configPath, yaml);

      const config = await parseInjectionConfig(configPath);

      // Null treated as invalid, use defaults
      expect(config.enabled).toBe(true);
      expect(config.types.gotcha.threshold).toBe(0.2);
    });

    it('should handle deeply nested partial config', async () => {
      const yaml = `---
injection:
  types:
    learning:
      enabled: true
      # threshold and limit not specified
---
`;
      fs.writeFileSync(configPath, yaml);

      const config = await parseInjectionConfig(configPath);

      expect(config.types.learning.enabled).toBe(true);
      expect(config.types.learning.threshold).toBe(0.4); // Default
      expect(config.types.learning.limit).toBe(2); // Default
    });
  });
});
