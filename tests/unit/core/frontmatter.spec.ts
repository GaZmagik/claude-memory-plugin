/**
 * T012: Unit test for YAML frontmatter parser
 *
 * Tests parsing and serialisation of YAML frontmatter in memory files.
 */

import { describe, it, expect } from 'vitest';
import { parseFrontmatter, serialiseFrontmatter, parseMemoryFile, serialiseMemoryFile } from '../../../skills/memory/src/core/frontmatter.js';
import { MemoryType, Scope, Severity } from '../../../skills/memory/src/types/enums.js';
import type { MemoryFrontmatter } from '../../../skills/memory/src/types/memory.js';

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
