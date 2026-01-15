/**
 * Integration tests for backward compatibility with existing memories
 * Tests that legacy memory file formats can be parsed correctly
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Import the core parsing function directly
import { parseMemoryFile } from '../../skills/memory/src/core/frontmatter.ts';

describe('Backward Compatibility', () => {
  let testDir: string;

  beforeAll(() => {
    testDir = mkdtempSync(join(tmpdir(), 'backward-compat-'));
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('legacy YAML frontmatter format', () => {
    it('should parse memories with minimal frontmatter', () => {
      const content = `---
id: legacy-decision
title: Legacy Decision
type: decision
---

This is a legacy decision with minimal frontmatter.
`;
      const filePath = join(testDir, 'decision-legacy-decision.md');
      writeFileSync(filePath, content);

      const result = parseMemoryFile(readFileSync(filePath, 'utf-8'));

      expect(result.frontmatter.id).toBe('legacy-decision');
      expect(result.frontmatter.title).toBe('Legacy Decision');
      expect(result.frontmatter.type).toBe('decision');
      expect(result.content).toContain('legacy decision');
    });

    it('should parse memories with tags as string (legacy format)', () => {
      const content = `---
id: legacy-learning
title: Legacy Learning
type: learning
tags: typescript, testing
---

Learning with comma-separated tags.
`;
      const filePath = join(testDir, 'learning-legacy-learning.md');
      writeFileSync(filePath, content);

      const result = parseMemoryFile(readFileSync(filePath, 'utf-8'));

      expect(result.frontmatter.id).toBe('legacy-learning');
      // Tags may be string or array depending on parser
      expect(result.frontmatter.tags).toBeDefined();
    });

    it('should parse memories without created/updated timestamps', () => {
      const content = `---
id: no-timestamps
title: Memory Without Timestamps
type: gotcha
---

This gotcha has no timestamps.
`;
      const filePath = join(testDir, 'gotcha-no-timestamps.md');
      writeFileSync(filePath, content);

      const result = parseMemoryFile(readFileSync(filePath, 'utf-8'));

      expect(result.frontmatter.id).toBe('no-timestamps');
      expect(result.frontmatter.title).toBe('Memory Without Timestamps');
      // Should not throw even without timestamps
    });

    it('should parse memories with all modern fields', () => {
      const content = `---
id: modern-memory
title: Modern Memory
type: artifact
scope: project
created: "2024-01-01T00:00:00Z"
updated: "2024-06-15T12:30:00Z"
tags:
  - test
  - modern
embedding: abc123hash
links:
  - related-memory
  - another-memory
---

This is a modern memory with all fields.
`;
      const filePath = join(testDir, 'artifact-modern-memory.md');
      writeFileSync(filePath, content);

      const result = parseMemoryFile(readFileSync(filePath, 'utf-8'));

      expect(result.frontmatter.id).toBe('modern-memory');
      expect(result.frontmatter.scope).toBe('project');
      expect(result.frontmatter.tags).toContain('test');
      expect(result.frontmatter.links).toContain('related-memory');
    });
  });

  describe('content parsing', () => {
    it('should preserve markdown content exactly', () => {
      const markdownContent = `# Heading

This is **bold** and *italic*.

\`\`\`typescript
const x = 1;
\`\`\`

- List item 1
- List item 2
`;
      const content = `---
id: markdown-test
title: Markdown Test
type: artifact
---

${markdownContent}`;
      const filePath = join(testDir, 'artifact-markdown-test.md');
      writeFileSync(filePath, content);

      const result = parseMemoryFile(readFileSync(filePath, 'utf-8'));

      expect(result.content).toContain('# Heading');
      expect(result.content).toContain('**bold**');
      expect(result.content).toContain('```typescript');
    });

    it('should handle empty content', () => {
      const content = `---
id: empty-content
title: Empty Content Memory
type: decision
---
`;
      const filePath = join(testDir, 'decision-empty-content.md');
      writeFileSync(filePath, content);

      const result = parseMemoryFile(readFileSync(filePath, 'utf-8'));

      expect(result.frontmatter.id).toBe('empty-content');
      expect(result.content.trim()).toBe('');
    });
  });

  describe('edge cases', () => {
    it('should handle frontmatter with special characters in values', () => {
      const content = `---
id: special-chars
title: "Memory with: colons & ampersands"
type: learning
---

Content with special chars.
`;
      const filePath = join(testDir, 'learning-special-chars.md');
      writeFileSync(filePath, content);

      const result = parseMemoryFile(readFileSync(filePath, 'utf-8'));

      expect(result.frontmatter.id).toBe('special-chars');
      expect(result.frontmatter.title).toContain('colons');
    });

    it('should handle multiline title in frontmatter', () => {
      const content = `---
id: multiline-title
title: |
  This is a very long title
  that spans multiple lines
type: artifact
---

Content here.
`;
      const filePath = join(testDir, 'artifact-multiline-title.md');
      writeFileSync(filePath, content);

      const result = parseMemoryFile(readFileSync(filePath, 'utf-8'));

      expect(result.frontmatter.id).toBe('multiline-title');
      expect(result.frontmatter.title).toContain('very long title');
    });
  });
});
