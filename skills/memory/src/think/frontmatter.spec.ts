/**
 * Tests for Think Frontmatter Utilities
 */

import { describe, it, expect } from 'bun:test';
import { memoryId, sessionId } from '../test-utils/branded-helpers.js';
import {
  parseThinkDocument,
  parseThinkFrontmatter,
  parseThoughts,
  serialiseThinkDocument,
  serialiseThinkFrontmatter,
  createThinkFrontmatter,
  formatThought,
  generateInitialContent,
  concludeFrontmatter,
} from './frontmatter.js';
import { MemoryType, Scope, ThinkStatus, ThoughtType } from '../types/enums.js';
import type { ThinkFrontmatter, ThoughtEntry } from '../types/think.js';

describe('think/frontmatter', () => {
  describe('createThinkFrontmatter', () => {
    it('creates frontmatter with required fields', () => {
      const fm = createThinkFrontmatter({ topic: 'Test topic' });

      expect(fm.type).toBe(MemoryType.Breadcrumb);
      expect(fm.title).toBe('Think: Test topic');
      expect(fm.topic).toBe('Test topic');
      expect(fm.status).toBe(ThinkStatus.Active);
      expect(fm.scope).toBe(Scope.Project);
      expect(fm.tags).toContain('think');
      expect(fm.tags).toContain('active');
      expect(fm.created).toBeDefined();
      expect(fm.updated).toBeDefined();
    });

    it('respects custom scope', () => {
      const fm = createThinkFrontmatter({ topic: 'Test', scope: Scope.Local });
      expect(fm.scope).toBe(Scope.Local);
    });
  });

  describe('serialiseThinkFrontmatter', () => {
    it('serialises all required fields', () => {
      const fm = createThinkFrontmatter({ topic: 'Test topic' });
      const yaml = serialiseThinkFrontmatter(fm);

      expect(yaml).toContain('type:');
      expect(yaml).toContain('title:');
      expect(yaml).toContain('topic:');
      expect(yaml).toContain('status:');
      expect(yaml).toContain('created:');
      expect(yaml).toContain('updated:');
      expect(yaml).toContain('tags:');
      expect(yaml).toContain('scope:');
    });

    it('includes conclusion when present', () => {
      const fm: ThinkFrontmatter = {
        ...createThinkFrontmatter({ topic: 'Test' }),
        conclusion: 'My conclusion',
      };
      const yaml = serialiseThinkFrontmatter(fm);
      expect(yaml).toContain('conclusion:');
    });

    it('includes promotedTo when present', () => {
      const fm: ThinkFrontmatter = {
        ...createThinkFrontmatter({ topic: 'Test' }),
        promotedTo: memoryId('decision-test-topic'),
      };
      const yaml = serialiseThinkFrontmatter(fm);
      expect(yaml).toContain('promotedTo:');
    });
  });

  describe('parseThinkFrontmatter', () => {
    it('parses valid frontmatter', () => {
      const yaml = `
type: breadcrumb
title: "Think: Test topic"
topic: Test topic
status: active
created: 2026-01-12T10:00:00Z
updated: 2026-01-12T10:00:00Z
tags: [think, active]
scope: project
`.trim();

      const fm = parseThinkFrontmatter(yaml);
      expect(fm.topic).toBe('Test topic');
      expect(fm.status).toBe(ThinkStatus.Active);
    });

    it('throws on missing topic', () => {
      const yaml = `
status: active
`.trim();

      expect(() => parseThinkFrontmatter(yaml)).toThrow('topic is required');
    });

    it('allows missing status (derived later by parseThinkDocument)', () => {
      const yaml = `
topic: Test
`.trim();

      // parseThinkFrontmatter allows missing status for backwards compatibility
      // Status is derived from tags or last thought in parseThinkDocument
      const fm = parseThinkFrontmatter(yaml);
      expect(fm.topic).toBe('Test');
      expect(fm.status).toBeUndefined();
    });
  });

  describe('formatThought', () => {
    it('formats basic thought', () => {
      const entry: ThoughtEntry = {
        timestamp: '2026-01-12T10:30:00Z',
        type: ThoughtType.Thought,
        content: 'My thought content',
      };

      const md = formatThought(entry);
      expect(md).toContain('### 2026-01-12T10:30:00Z - Thought');
      expect(md).toContain('My thought content');
    });

    it('formats counter-argument', () => {
      const entry: ThoughtEntry = {
        timestamp: '2026-01-12T10:30:00Z',
        type: ThoughtType.CounterArgument,
        content: 'Counter content',
      };

      const md = formatThought(entry);
      expect(md).toContain('Counter-argument');
    });

    it('formats alternative/branch', () => {
      const entry: ThoughtEntry = {
        timestamp: '2026-01-12T10:30:00Z',
        type: ThoughtType.Branch,
        content: 'Branch content',
      };

      const md = formatThought(entry);
      expect(md).toContain('Alternative');
    });

    it('includes attribution', () => {
      const entry: ThoughtEntry = {
        timestamp: '2026-01-12T10:30:00Z',
        type: ThoughtType.Thought,
        content: 'Content',
        by: 'Claude',
      };

      const md = formatThought(entry);
      expect(md).toContain('(Claude)');
    });

    it('includes session ID with attribution', () => {
      const entry: ThoughtEntry = {
        timestamp: '2026-01-12T10:30:00Z',
        type: ThoughtType.Thought,
        content: 'Content',
        by: 'Claude',
        sessionId: sessionId('abc-123'),
      };

      const md = formatThought(entry);
      expect(md).toContain('(Claude [abc-123])');
    });
  });

  describe('parseThoughts', () => {
    it('parses thoughts from content', () => {
      const content = `
# Topic

## Thoughts

### 2026-01-12T10:00:00Z - Thought
First thought

### 2026-01-12T10:05:00Z - Counter-argument (Claude)
Counter point
`.trim();

      const thoughts = parseThoughts(content);
      expect(thoughts).toHaveLength(2);
      expect(thoughts[0]!.type).toBe(ThoughtType.Thought);
      expect(thoughts[0]!.content).toBe('First thought');
      expect(thoughts[1]!.type).toBe(ThoughtType.CounterArgument);
      expect(thoughts[1]!.by).toBe('Claude');
    });

    it('parses attribution with session ID', () => {
      const content = `
### 2026-01-12T10:00:00Z - Thought (Claude [abc-123])
Content here
`.trim();

      const thoughts = parseThoughts(content);
      expect(thoughts).toHaveLength(1);
      expect(thoughts[0]!.by).toBe('Claude');
      expect(thoughts[0]!.sessionId).toBe(sessionId('abc-123'));
    });

    it('returns empty array for no thoughts', () => {
      const thoughts = parseThoughts('# Topic\n\nNo thoughts yet');
      expect(thoughts).toHaveLength(0);
    });
  });

  describe('generateInitialContent', () => {
    it('generates content with topic', () => {
      const content = generateInitialContent('My Topic');
      expect(content).toContain('# My Topic');
      expect(content).toContain('## Thoughts');
    });
  });

  describe('parseThinkDocument', () => {
    it('parses complete document', () => {
      const doc = `---
type: breadcrumb
title: "Think: Test"
topic: Test
status: active
created: 2026-01-12T10:00:00Z
updated: 2026-01-12T10:00:00Z
tags: [think, active]
scope: project
---

# Test

## Thoughts

### 2026-01-12T10:00:00Z - Thought
My thought
`;

      const result = parseThinkDocument(doc);
      expect(result.frontmatter.topic).toBe('Test');
      expect(result.thoughts).toHaveLength(1);
      expect(result.rawContent).toContain('# Test');
    });

    it('throws on missing frontmatter', () => {
      expect(() => parseThinkDocument('No frontmatter here')).toThrow('missing frontmatter');
    });
  });

  describe('serialiseThinkDocument', () => {
    it('combines frontmatter and content', () => {
      const fm = createThinkFrontmatter({ topic: 'Test' });
      const content = '# Test\n\n## Thoughts';

      const doc = serialiseThinkDocument(fm, content);
      expect(doc).toMatch(/^---\n/);
      expect(doc).toContain('---\n\n# Test');
    });
  });

  describe('concludeFrontmatter', () => {
    it('updates status and adds conclusion', () => {
      const fm = createThinkFrontmatter({ topic: 'Test' });
      const concluded = concludeFrontmatter(fm, 'Final decision');

      expect(concluded.status).toBe(ThinkStatus.Concluded);
      expect(concluded.conclusion).toBe('Final decision');
      expect(concluded.tags).toContain('concluded');
      expect(concluded.tags).not.toContain('active');
    });

    it('includes promotedTo when provided', () => {
      const fm = createThinkFrontmatter({ topic: 'Test' });
      const concluded = concludeFrontmatter(fm, 'Decision', 'decision-test');

      expect(concluded.promotedTo).toBe(memoryId('decision-test'));
    });
  });
});
