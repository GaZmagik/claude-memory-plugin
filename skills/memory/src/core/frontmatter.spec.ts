/**
 * T012: Unit test for YAML frontmatter parser
 *
 * Tests parsing and serialisation of YAML frontmatter in memory files.
 */

import { describe, it, expect } from 'vitest';
import {
  parseFrontmatter,
  serialiseFrontmatter,
  parseMemoryFile,
  serialiseMemoryFile,
  updateFrontmatter,
  createFrontmatter,
  extractId,
  hasRequiredFields,
} from './frontmatter.js';
import { MemoryType, Scope, Severity } from '../types/enums.js';
import type { MemoryFrontmatter } from '../types/memory.js';

describe('parseFrontmatter', () => {
  it('should parse valid YAML frontmatter', () => {
    const yaml = `type: decision
title: Use OAuth2 for authentication
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags:
  - auth
  - security`;

    const result = parseFrontmatter(yaml);
    expect(result.type).toBe(MemoryType.Decision);
    expect(result.title).toBe('Use OAuth2 for authentication');
    expect(result.tags).toEqual(['auth', 'security']);
  });

  it('should parse frontmatter with optional fields', () => {
    const yaml = `type: gotcha
title: Beware of token expiry
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags:
  - auth
severity: high
source: src/auth/token.ts
links:
  - decision-oauth2`;

    const result = parseFrontmatter(yaml);
    expect(result.severity).toBe(Severity.High);
    expect(result.source).toBe('src/auth/token.ts');
    expect(result.links).toEqual(['decision-oauth2']);
  });

  it('should throw on invalid YAML', () => {
    const invalidYaml = `type: decision
title: [invalid yaml`;

    expect(() => parseFrontmatter(invalidYaml)).toThrow();
  });

  it('should throw on missing required fields', () => {
    const missingType = `title: Missing type
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags: []`;

    expect(() => parseFrontmatter(missingType)).toThrow(/type/i);
  });
});

describe('serialiseFrontmatter', () => {
  it('should serialise frontmatter to valid YAML', () => {
    const frontmatter: MemoryFrontmatter = {
      type: MemoryType.Decision,
      title: 'Test Decision',
      created: '2026-01-10T12:00:00Z',
      updated: '2026-01-10T12:00:00Z',
      tags: ['test', 'example'],
    };

    const yaml = serialiseFrontmatter(frontmatter);
    expect(yaml).toContain('type: decision');
    expect(yaml).toContain('title: Test Decision');
    expect(yaml).toContain('- test');
    expect(yaml).toContain('- example');
  });

  it('should include optional fields when present', () => {
    const frontmatter: MemoryFrontmatter = {
      type: MemoryType.Gotcha,
      title: 'Test Gotcha',
      created: '2026-01-10T12:00:00Z',
      updated: '2026-01-10T12:00:00Z',
      tags: ['warning'],
      severity: Severity.High,
      links: ['related-memory'],
    };

    const yaml = serialiseFrontmatter(frontmatter);
    expect(yaml).toContain('severity: high');
    expect(yaml).toContain('- related-memory');
  });

  it('should omit undefined optional fields', () => {
    const frontmatter: MemoryFrontmatter = {
      type: MemoryType.Learning,
      title: 'Simple Learning',
      created: '2026-01-10T12:00:00Z',
      updated: '2026-01-10T12:00:00Z',
      tags: [],
    };

    const yaml = serialiseFrontmatter(frontmatter);
    expect(yaml).not.toContain('severity');
    expect(yaml).not.toContain('links');
    expect(yaml).not.toContain('source');
  });
});

describe('parseMemoryFile', () => {
  it('should parse complete memory file with frontmatter and content', () => {
    const fileContent = `---
type: decision
title: Use OAuth2
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags:
  - auth
---

# Use OAuth2 for Authentication

We decided to use OAuth2 because it provides secure token-based auth.

## Rationale

- Industry standard
- Supports refresh tokens
`;

    const result = parseMemoryFile(fileContent);
    expect(result.frontmatter.type).toBe(MemoryType.Decision);
    expect(result.frontmatter.title).toBe('Use OAuth2');
    expect(result.content).toContain('# Use OAuth2 for Authentication');
    expect(result.content).toContain('## Rationale');
  });

  it('should handle empty content', () => {
    const fileContent = `---
type: breadcrumb
title: Placeholder
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags: []
---
`;

    const result = parseMemoryFile(fileContent);
    expect(result.frontmatter.type).toBe(MemoryType.Breadcrumb);
    expect(result.content.trim()).toBe('');
  });

  it('should throw if no frontmatter delimiters', () => {
    const noFrontmatter = `# Just Content

No frontmatter here.`;

    expect(() => parseMemoryFile(noFrontmatter)).toThrow(/frontmatter/i);
  });

  it('should handle Windows line endings (CRLF)', () => {
    // Content with \r\n line endings (Windows-style)
    const windowsContent =
      '---\r\n' +
      'type: decision\r\n' +
      'title: Windows File\r\n' +
      'created: 2026-01-10T12:00:00Z\r\n' +
      'updated: 2026-01-10T12:00:00Z\r\n' +
      'tags:\r\n' +
      '  - windows\r\n' +
      '---\r\n' +
      '\r\n' +
      '# Content with CRLF\r\n';

    // Normalise CRLF to LF before parsing (simulating what Git or editors might do)
    const normalised = windowsContent.replace(/\r\n/g, '\n');
    const result = parseMemoryFile(normalised);

    expect(result.frontmatter.type).toBe(MemoryType.Decision);
    expect(result.frontmatter.title).toBe('Windows File');
    expect(result.content).toContain('# Content with CRLF');
  });

  it('should fail on raw Windows line endings without normalisation', () => {
    // Raw CRLF without normalisation - regex expects \n only
    const windowsContent =
      '---\r\n' +
      'type: decision\r\n' +
      'title: Windows File\r\n' +
      'created: 2026-01-10T12:00:00Z\r\n' +
      'updated: 2026-01-10T12:00:00Z\r\n' +
      'tags: []\r\n' +
      '---\r\n' +
      '\r\n' +
      '# Content\r\n';

    // Document that raw CRLF fails - normalisation is required
    expect(() => parseMemoryFile(windowsContent)).toThrow(/frontmatter/i);
  });
});

describe('serialiseMemoryFile', () => {
  it('should create valid memory file with frontmatter and content', () => {
    const frontmatter: MemoryFrontmatter = {
      type: MemoryType.Artifact,
      title: 'Code Pattern',
      created: '2026-01-10T12:00:00Z',
      updated: '2026-01-10T12:00:00Z',
      tags: ['pattern', 'typescript'],
    };
    const content = '# Code Pattern\n\nExample code here.';

    const result = serialiseMemoryFile(frontmatter, content);
    expect(result).toMatch(/^---\n/);
    expect(result).toMatch(/\n---\n\n/);
    expect(result).toContain('type: artifact');
    expect(result).toContain('# Code Pattern');
  });

  it('should be reversible (parse → serialise → parse)', () => {
    const original = `---
type: learning
title: Test Roundtrip
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags:
  - test
---

# Content

Body text.
`;

    const parsed = parseMemoryFile(original);
    const serialised = serialiseMemoryFile(parsed.frontmatter, parsed.content);
    const reparsed = parseMemoryFile(serialised);

    expect(reparsed.frontmatter.type).toBe(parsed.frontmatter.type);
    expect(reparsed.frontmatter.title).toBe(parsed.frontmatter.title);
    expect(reparsed.content.trim()).toBe(parsed.content.trim());
  });
});

describe('parseFrontmatter edge cases', () => {
  it('should throw on null YAML', () => {
    expect(() => parseFrontmatter('')).toThrow(/must be a YAML object/i);
  });

  it('should throw on non-object YAML (string)', () => {
    expect(() => parseFrontmatter('"just a string"')).toThrow(/must be a YAML object/i);
  });

  it('should throw on missing title', () => {
    const missingTitle = `type: decision
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags: []`;

    expect(() => parseFrontmatter(missingTitle)).toThrow(/title is required/i);
  });
});

describe('serialiseFrontmatter with all optional fields', () => {
  it('should include source when present', () => {
    const frontmatter: MemoryFrontmatter = {
      type: MemoryType.Gotcha,
      title: 'Test with Source',
      created: '2026-01-10T12:00:00Z',
      updated: '2026-01-10T12:00:00Z',
      tags: ['test'],
      source: 'src/example.ts',
    };

    const yaml = serialiseFrontmatter(frontmatter);
    expect(yaml).toContain('source: src/example.ts');
  });

  it('should include meta when present', () => {
    const frontmatter: MemoryFrontmatter = {
      type: MemoryType.Decision,
      title: 'Test with Meta',
      created: '2026-01-10T12:00:00Z',
      updated: '2026-01-10T12:00:00Z',
      tags: ['test'],
      meta: { id: 'custom-id', custom: 'value' },
    };

    const yaml = serialiseFrontmatter(frontmatter);
    expect(yaml).toContain('meta:');
    expect(yaml).toContain('id: custom-id');
  });

  it('should include scope when present', () => {
    const frontmatter: MemoryFrontmatter = {
      type: MemoryType.Learning,
      title: 'Test with Scope',
      created: '2026-01-10T12:00:00Z',
      updated: '2026-01-10T12:00:00Z',
      tags: ['test'],
      scope: Scope.Global,
    };

    const yaml = serialiseFrontmatter(frontmatter);
    expect(yaml).toContain('scope: global');
  });
});

describe('updateFrontmatter', () => {
  it('should update specified fields', () => {
    const existing: MemoryFrontmatter = {
      type: MemoryType.Decision,
      title: 'Original Title',
      created: '2026-01-01T00:00:00Z',
      updated: '2026-01-01T00:00:00Z',
      tags: ['original'],
    };

    const result = updateFrontmatter(existing, { title: 'New Title' });

    expect(result.title).toBe('New Title');
    expect(result.type).toBe(MemoryType.Decision);
    expect(result.tags).toEqual(['original']);
  });

  it('should update the updated timestamp', () => {
    const existing: MemoryFrontmatter = {
      type: MemoryType.Learning,
      title: 'Test',
      created: '2026-01-01T00:00:00Z',
      updated: '2026-01-01T00:00:00Z',
      tags: [],
    };

    const before = new Date().toISOString();
    const result = updateFrontmatter(existing, {});
    const after = new Date().toISOString();

    expect(result.updated >= before).toBe(true);
    expect(result.updated <= after).toBe(true);
  });

  it('should preserve created timestamp', () => {
    const existing: MemoryFrontmatter = {
      type: MemoryType.Artifact,
      title: 'Test',
      created: '2020-01-01T00:00:00Z',
      updated: '2020-01-01T00:00:00Z',
      tags: [],
    };

    const result = updateFrontmatter(existing, { tags: ['new'] });

    expect(result.created).toBe('2020-01-01T00:00:00Z');
  });
});

describe('createFrontmatter', () => {
  it('should create frontmatter with required fields', () => {
    const result = createFrontmatter({
      type: MemoryType.Decision,
      title: 'Test Decision',
      tags: ['test'],
    });

    expect(result.type).toBe(MemoryType.Decision);
    expect(result.title).toBe('Test Decision');
    expect(result.tags).toEqual(['test']);
    expect(result.created).toBeDefined();
    expect(result.updated).toBeDefined();
  });

  it('should include scope when provided', () => {
    const result = createFrontmatter({
      type: MemoryType.Learning,
      title: 'Test',
      tags: [],
      scope: Scope.Global,
    });

    expect(result.scope).toBe(Scope.Global);
  });

  it('should include severity when provided', () => {
    const result = createFrontmatter({
      type: MemoryType.Gotcha,
      title: 'Test Gotcha',
      tags: [],
      severity: Severity.High,
    });

    expect(result.severity).toBe(Severity.High);
  });

  it('should include links when provided and non-empty', () => {
    const result = createFrontmatter({
      type: MemoryType.Decision,
      title: 'Test',
      tags: [],
      links: ['related-memory'],
    });

    expect(result.links).toEqual(['related-memory']);
  });

  it('should not include links when empty array', () => {
    const result = createFrontmatter({
      type: MemoryType.Decision,
      title: 'Test',
      tags: [],
      links: [],
    });

    expect(result.links).toBeUndefined();
  });

  it('should include source when provided', () => {
    const result = createFrontmatter({
      type: MemoryType.Gotcha,
      title: 'Test',
      tags: [],
      source: 'src/file.ts',
    });

    expect(result.source).toBe('src/file.ts');
  });

  it('should include meta when provided and non-empty', () => {
    const result = createFrontmatter({
      type: MemoryType.Artifact,
      title: 'Test',
      tags: [],
      meta: { custom: 'value' },
    });

    expect(result.meta).toEqual({ custom: 'value' });
  });

  it('should not include meta when empty object', () => {
    const result = createFrontmatter({
      type: MemoryType.Artifact,
      title: 'Test',
      tags: [],
      meta: {},
    });

    expect(result.meta).toBeUndefined();
  });
});

describe('extractId', () => {
  it('should extract ID from meta.id', () => {
    const frontmatter: MemoryFrontmatter = {
      type: MemoryType.Decision,
      title: 'Test',
      created: '2026-01-01T00:00:00Z',
      updated: '2026-01-01T00:00:00Z',
      tags: [],
      meta: { id: 'custom-memory-id' },
    };

    expect(extractId(frontmatter)).toBe('custom-memory-id');
  });

  it('should return null when no meta', () => {
    const frontmatter: MemoryFrontmatter = {
      type: MemoryType.Learning,
      title: 'Test',
      created: '2026-01-01T00:00:00Z',
      updated: '2026-01-01T00:00:00Z',
      tags: [],
    };

    expect(extractId(frontmatter)).toBeNull();
  });

  it('should return null when meta.id is not a string', () => {
    const frontmatter: MemoryFrontmatter = {
      type: MemoryType.Artifact,
      title: 'Test',
      created: '2026-01-01T00:00:00Z',
      updated: '2026-01-01T00:00:00Z',
      tags: [],
      meta: { id: 123 as any },
    };

    expect(extractId(frontmatter)).toBeNull();
  });
});

describe('hasRequiredFields', () => {
  it('should return true for valid frontmatter', () => {
    const valid = {
      type: 'decision',
      title: 'Test',
      created: '2026-01-01T00:00:00Z',
      updated: '2026-01-01T00:00:00Z',
      tags: ['test'],
    };

    expect(hasRequiredFields(valid)).toBe(true);
  });

  it('should return false for null', () => {
    expect(hasRequiredFields(null)).toBe(false);
  });

  it('should return false for non-object', () => {
    expect(hasRequiredFields('string')).toBe(false);
  });

  it('should return false for missing type', () => {
    const invalid = {
      title: 'Test',
      created: '2026-01-01T00:00:00Z',
      updated: '2026-01-01T00:00:00Z',
      tags: [],
    };

    expect(hasRequiredFields(invalid)).toBe(false);
  });

  it('should return false for missing title', () => {
    const invalid = {
      type: 'decision',
      created: '2026-01-01T00:00:00Z',
      updated: '2026-01-01T00:00:00Z',
      tags: [],
    };

    expect(hasRequiredFields(invalid)).toBe(false);
  });

  it('should return false for missing created', () => {
    const invalid = {
      type: 'decision',
      title: 'Test',
      updated: '2026-01-01T00:00:00Z',
      tags: [],
    };

    expect(hasRequiredFields(invalid)).toBe(false);
  });

  it('should return false for missing updated', () => {
    const invalid = {
      type: 'decision',
      title: 'Test',
      created: '2026-01-01T00:00:00Z',
      tags: [],
    };

    expect(hasRequiredFields(invalid)).toBe(false);
  });

  it('should return false for missing tags', () => {
    const invalid = {
      type: 'decision',
      title: 'Test',
      created: '2026-01-01T00:00:00Z',
      updated: '2026-01-01T00:00:00Z',
    };

    expect(hasRequiredFields(invalid)).toBe(false);
  });

  it('should return false for non-array tags', () => {
    const invalid = {
      type: 'decision',
      title: 'Test',
      created: '2026-01-01T00:00:00Z',
      updated: '2026-01-01T00:00:00Z',
      tags: 'not-an-array',
    };

    expect(hasRequiredFields(invalid)).toBe(false);
  });
});
