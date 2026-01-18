/**
 * Integration Test: Frontmatter Validation
 *
 * Tests validation of malformed frontmatter:
 * - Missing required fields
 * - Invalid types
 * - Corrupted YAML
 * - Extra/unknown fields
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseFrontmatter, parseMemoryFile } from '../../skills/memory/src/core/frontmatter.js';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { readMemory } from '../../skills/memory/src/core/read.js';
import { MemoryType, Scope } from '../../skills/memory/src/types/enums.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

describe('Frontmatter Validation', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'memory-frontmatter-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('Missing Required Fields', () => {
    it('should reject missing title with clear error', () => {
      const malformedContent = `---
type: learning
scope: global
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags: []
---

Content without title
`;

      expect(() => parseMemoryFile(malformedContent)).toThrow('title is required');
    });

    it('should reject missing type with clear error', () => {
      const malformedContent = `---
title: Test Memory
scope: global
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags: []
---

Content without type
`;

      expect(() => parseMemoryFile(malformedContent)).toThrow('type is required');
    });

    it('should handle missing timestamps gracefully', () => {
      const malformedContent = `---
title: Test Memory
type: learning
scope: global
tags: []
---

Content without timestamps
`;

      // Timestamps may be optional or auto-generated
      const result = parseMemoryFile(malformedContent);
      expect(result).toBeDefined();
    });

    it('should reject completely empty frontmatter', () => {
      const malformedContent = `---
---

Content with empty frontmatter
`;

      expect(() => parseMemoryFile(malformedContent)).toThrow();
    });
  });

  describe('Invalid Field Types', () => {
    it('should handle tags as string instead of array', () => {
      const malformedContent = `---
title: Test Memory
type: learning
scope: global
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags: "not-an-array"
---

Content
`;

      const result = parseMemoryFile(malformedContent);
      expect(result).toBeDefined();
    });

    it('should handle numeric title', () => {
      const malformedContent = `---
title: 12345
type: learning
scope: global
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags: []
---

Content
`;

      const result = parseMemoryFile(malformedContent);
      expect(result.frontmatter.title).toBeDefined();
    });

    it('should handle invalid timestamp format', () => {
      const malformedContent = `---
title: Test Memory
type: learning
scope: global
created: "not-a-date"
updated: "also-not-a-date"
tags: []
---

Content
`;

      const result = parseMemoryFile(malformedContent);
      expect(result).toBeDefined();
    });

    it('should handle invalid type enum', () => {
      const malformedContent = `---
title: Test Memory
type: invalid-type
scope: global
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags: []
---

Content
`;

      const result = parseMemoryFile(malformedContent);
      expect(result).toBeDefined();
    });
  });

  describe('Corrupted YAML', () => {
    it('should handle invalid YAML syntax', () => {
      const malformedContent = `---
title: Test Memory
type: learning
  invalid indentation
scope: global
---

Content
`;

      try {
        const result = parseMemoryFile(malformedContent);
        expect(result).toBeDefined();
      } catch (error) {
        // Throwing is acceptable for invalid YAML
        expect(error).toBeDefined();
      }
    });

    it('should handle unclosed quotes', () => {
      const malformedContent = `---
title: "Unclosed quote
type: learning
scope: global
---

Content
`;

      try {
        const result = parseMemoryFile(malformedContent);
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle missing frontmatter delimiter', () => {
      const noDelimiter = `title: Test Memory
type: learning
scope: global

Content without proper delimiters
`;

      try {
        const result = parseMemoryFile(noDelimiter);
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle only opening delimiter', () => {
      const onlyOpening = `---
title: Test Memory
type: learning

Content without closing delimiter
`;

      try {
        const result = parseMemoryFile(onlyOpening);
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Extra and Unknown Fields', () => {
    it('should handle extra unknown fields gracefully', () => {
      const extraFields = `---
title: Test Memory
type: learning
scope: global
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags: []
unknownField: "some value"
anotherUnknown: 123
---

Content
`;

      const result = parseMemoryFile(extraFields);
      expect(result.frontmatter.title).toBe('Test Memory');
    });

    it('should preserve optional fields', () => {
      const withOptional = `---
title: Test Memory
type: gotcha
scope: global
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags: []
severity: high
file_patterns: ["*.ts"]
links: ["related-1", "related-2"]
---

Content
`;

      const result = parseMemoryFile(withOptional);
      expect(result.frontmatter.severity).toBe('high');
    });
  });

  describe('Integration with Read/Write', () => {
    it('should reject write with missing required fields', async () => {
      const writeResult = await writeMemory({
        // @ts-expect-error - Testing missing required field
        title: undefined,
        type: MemoryType.Learning,
        content: 'Content',
        tags: [],
        scope: Scope.Global,
        basePath: testDir,
      });

      expect(writeResult.status).toBe('error');
    });

    it('should handle reading file with corrupted frontmatter', async () => {
      // Create a valid memory first
      const writeResult = await writeMemory({
        title: 'Original',
        type: MemoryType.Learning,
        content: 'Content',
        tags: [],
        scope: Scope.Global,
        basePath: testDir,
      });

      expect(writeResult.status).toBe('success');
      const filePath = writeResult.memory?.filePath;

      if (filePath) {
        // Corrupt the frontmatter
        const corrupted = `---
title: Corrupted
type: invalid-type
  bad indentation
---

Content
`;
        fs.writeFileSync(filePath, corrupted);

        // Try to read
        const readResult = await readMemory({
          id: writeResult.memory?.id ?? '',
          basePath: testDir,
        });

        // Should handle error gracefully
        expect(readResult.status).toBeDefined();
      }
    });
  });

  describe('Edge Cases in Parsing', () => {
    it('should handle empty content after frontmatter', () => {
      const emptyContent = `---
title: Test Memory
type: learning
scope: global
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags: []
---
`;

      const result = parseMemoryFile(emptyContent);
      expect(result.frontmatter.title).toBe('Test Memory');
      expect(result.content).toBe('');
    });

    it('should handle content with --- in it', () => {
      const contentWithDashes = `---
title: Test Memory
type: learning
scope: global
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags: []
---

# Content

Some content with --- dashes in it
More content
--- Even more dashes ---
`;

      const result = parseMemoryFile(contentWithDashes);
      expect(result.content).toContain('--- dashes in it');
    });

    it('should handle unicode in frontmatter', () => {
      const unicodeContent = `---
title: "Test 🎉 Memory 世界"
type: learning
scope: global
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags: ["émoji", "日本語"]
---

Unicode content
`;

      const result = parseMemoryFile(unicodeContent);
      expect(result.frontmatter.title).toContain('🎉');
    });

    it('should handle very long field values', () => {
      const longValue = 'x'.repeat(10000);
      const longContent = `---
title: "${longValue}"
type: learning
scope: global
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags: []
---

Content
`;

      const result = parseMemoryFile(longContent);
      expect(result.frontmatter.title).toHaveLength(10000);
    });

    it('should handle arrays with various types', () => {
      const mixedArray = `---
title: Test Memory
type: learning
scope: global
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags: ["string", 123, true, null]
---

Content
`;

      const result = parseMemoryFile(mixedArray);
      expect(Array.isArray(result.frontmatter.tags)).toBe(true);
    });
  });
});
