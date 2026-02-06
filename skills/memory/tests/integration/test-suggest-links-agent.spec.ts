/**
 * Integration Tests for Suggest-Links with Agent Scope (Phase E - T112)
 *
 * Tests link suggestion functionality within agent-scoped memories.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cmdSuggestLinks } from '../../src/cli/commands/suggest-links.js';
import { writeMemory } from '../../src/core/write.js';
import { Scope } from '../../src/types/enums.js';
import type { ParsedArgs } from '../../src/cli/parser.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('Suggest-links with agent scope', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suggest-agent-test-'));
    process.chdir(testDir);
    fs.mkdirSync('.git');

    // Create related agent memories
    await writeMemory({
      id: 'ts-generics-1',
      type: 'learning',
      title: 'TypeScript Generics',
      content: 'Advanced generics patterns with constraints and conditional types',
      scope: Scope.AgentProject,
      agent: 'typescript-pro',
      projectRoot: testDir,
      tags: ['typescript', 'generics', 'advanced'],
    });

    await writeMemory({
      id: 'ts-types-1',
      type: 'decision',
      title: 'Type System Design',
      content: 'Use strict mode and generic constraints for type safety',
      scope: Scope.AgentProject,
      agent: 'typescript-pro',
      projectRoot: testDir,
      tags: ['typescript', 'types', 'design'],
    });

    await writeMemory({
      id: 'ts-patterns-1',
      type: 'artifact',
      title: 'Generic Utility Types',
      content: 'Reusable generic patterns and utility types',
      scope: Scope.AgentProject,
      agent: 'typescript-pro',
      projectRoot: testDir,
      tags: ['typescript', 'patterns', 'generics'],
    });

    // Create unrelated agent memory
    await writeMemory({
      id: 'ts-react-1',
      type: 'learning',
      title: 'React Hooks',
      content: 'useState and useEffect patterns',
      scope: Scope.AgentProject,
      agent: 'typescript-pro',
      projectRoot: testDir,
      tags: ['react', 'hooks'],
    });
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('suggests links within agent scope only', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro' },
    };

    const result = await cmdSuggestLinks(args);

    expect(result.status).toBe('success');
    const suggestions = (result.data as any).suggestions;
    expect(suggestions).toBeDefined();
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('suggests links based on semantic similarity', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', threshold: '0.7' },
    };

    const result = await cmdSuggestLinks(args);
    const suggestions = (result.data as any).suggestions;

    // Should suggest linking generics-related memories
    const genericsLinks = suggestions.filter((s: any) =>
      s.source.includes('generics') || s.target.includes('generics')
    );
    expect(genericsLinks.length).toBeGreaterThan(0);
  });

  it('suggests links based on shared tags', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', method: 'tags' },
    };

    const result = await cmdSuggestLinks(args);
    const suggestions = (result.data as any).suggestions;

    // Should suggest linking memories with shared 'typescript' tag
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('excludes already linked memories from suggestions', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro' },
    };

    const result = await cmdSuggestLinks(args);
    const suggestions = (result.data as any).suggestions;

    // Each suggestion should be for unlinked pairs
    suggestions.forEach((s: any) => {
      expect(s.alreadyLinked).toBe(false);
    });
  });

  it('ranks suggestions by confidence score', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro' },
    };

    const result = await cmdSuggestLinks(args);
    const suggestions = (result.data as any).suggestions;

    // Should be sorted by confidence (highest first)
    for (let i = 1; i < suggestions.length; i++) {
      expect(suggestions[i - 1].confidence).toBeGreaterThanOrEqual(suggestions[i].confidence);
    }
  });

  it('filters suggestions by minimum threshold', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', threshold: '0.8' },
    };

    const result = await cmdSuggestLinks(args);
    const suggestions = (result.data as any).suggestions;

    // All suggestions should meet threshold
    suggestions.forEach((s: any) => {
      expect(s.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  it('limits number of suggestions when limit set', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', limit: '5' },
    };

    const result = await cmdSuggestLinks(args);
    const suggestions = (result.data as any).suggestions;

    expect(suggestions.length).toBeLessThanOrEqual(5);
  });

  it('includes rationale for each suggestion', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro' },
    };

    const result = await cmdSuggestLinks(args);
    const suggestions = (result.data as any).suggestions;

    suggestions.forEach((s: any) => {
      expect(s.rationale).toBeDefined();
      expect(s.rationale.length).toBeGreaterThan(0);
    });
  });

  it('suggests bidirectional links when appropriate', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', bidirectional: true },
    };

    const result = await cmdSuggestLinks(args);
    const suggestions = (result.data as any).suggestions;

    // Check if suggestions include both directions for highly related pairs
    const sources = suggestions.map((s: any) => s.source);
    const targets = suggestions.map((s: any) => s.target);

    // Some source should also appear as target (bidirectional)
    const hasBidirectional = sources.some((src: string) => targets.includes(src));
    expect(hasBidirectional).toBe(true);
  });

  it('does not suggest links to shared memories without flag', async () => {
    // Create project-level memory
    await writeMemory({
      id: 'project-types-1',
      type: 'artifact',
      title: 'Type Definitions',
      content: 'Shared type definitions',
      scope: Scope.Project,
      projectRoot: testDir,
      tags: ['typescript', 'types'],
    });

    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro' },
    };

    const result = await cmdSuggestLinks(args);
    const suggestions = (result.data as any).suggestions;

    // Should not include project memory
    const hasProjectLink = suggestions.some(
      (s: any) => s.source === 'project-types-1' || s.target === 'project-types-1'
    );
    expect(hasProjectLink).toBe(false);
  });

  it('includes shared memories when --include-shared flag used', async () => {
    // Create project-level memory
    await writeMemory({
      id: 'project-types-1',
      type: 'artifact',
      title: 'Type Definitions',
      content: 'Shared type definitions for TypeScript generics',
      scope: Scope.Project,
      projectRoot: testDir,
      tags: ['typescript', 'types', 'generics'],
    });

    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', 'include-shared': true },
    };

    const result = await cmdSuggestLinks(args);
    const suggestions = (result.data as any).suggestions;

    // Should include suggestions to project memory
    const hasProjectLink = suggestions.some(
      (s: any) => s.source === 'project-types-1' || s.target === 'project-types-1'
    );
    expect(hasProjectLink).toBe(true);
  });

  it('outputs suggestions in JSON format when flag set', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', json: true },
    };

    const result = await cmdSuggestLinks(args);

    expect(result.status).toBe('success');
    const jsonStr = JSON.stringify(result.data);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.suggestions).toBeDefined();
  });

  it('handles agent with no potential links', async () => {
    // Create isolated agent with single memory
    await writeMemory({
      id: 'isolated-mem-1',
      type: 'learning',
      title: 'Isolated Memory',
      content: 'Unique content with no matches',
      scope: Scope.AgentProject,
      agent: 'isolated-agent',
      projectRoot: testDir,
      tags: ['unique', 'isolated'],
    });

    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'isolated-agent' },
    };

    const result = await cmdSuggestLinks(args);

    expect(result.status).toBe('success');
    const suggestions = (result.data as any).suggestions;
    expect(suggestions).toHaveLength(0);
  });

  it('groups suggestions by relationship type', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', 'group-by-type': true },
    };

    const result = await cmdSuggestLinks(args);
    const data = result.data as any;

    expect(data.grouped).toBeDefined();
    expect(data.grouped).toHaveProperty('relatedTo');
    expect(data.grouped).toHaveProperty('dependsOn');
  });

  it('auto-applies suggestions when --apply flag used', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', apply: true, threshold: '0.9' },
    };

    const result = await cmdSuggestLinks(args);
    const data = result.data as any;

    expect(data.applied).toBeDefined();
    expect(data.applied.count).toBeGreaterThanOrEqual(0);
  });
});
