/**
 * T143: Integration test for linking decision to rule with governed-by edge
 *
 * Verifies that decisions can be linked to rule nodes using the governed-by edge type,
 * and that the relationship appears in the graph.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { syncMemories } from '../../skills/memory/src/maintenance/sync.js';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { linkMemories } from '../../skills/memory/src/graph/link.js';
import { getEdges } from '../../skills/memory/src/graph/edges.js';
import { loadGraph } from '../../skills/memory/src/graph/structure.js';
import { MemoryType, Scope, EdgeType } from '../../skills/memory/src/types/enums.js';

describe('T143: Link decision to rule with governed-by edge', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'link-decision-rule-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should link decision to rule node with governed-by edge', async () => {
    // Create CLAUDE.md rule
    fs.writeFileSync(
      path.join(tempDir, 'CLAUDE.md'),
      '# Project Rules\n\nAlways follow TDD principles.'
    );

    // Sync to index rule
    await syncMemories({ basePath: tempDir });

    // Create a decision memory
    const decisionResult = await writeMemory({
      title: 'Use TDD for All Features',
      type: MemoryType.Decision,
      content: '# Decision\n\nWe will use TDD for all feature development.',
      tags: ['tdd', 'development'],
      scope: Scope.Project,
      basePath: tempDir,
    });

    expect(decisionResult.status).toBe('success');
    const decisionId = decisionResult.memory?.id!;

    // Link decision to rule with governed-by edge
    const linkResult = await linkMemories({
      source: decisionId,
      target: 'rule-project-claude-md-root',
      relation: EdgeType.GovernedBy,
      basePath: tempDir,
    });

    expect(linkResult.status).toBe('success');
    expect(linkResult.edge).toBeDefined();
    expect(linkResult.edge?.source).toBe(decisionId);
    expect(linkResult.edge?.target).toBe('rule-project-claude-md-root');
    expect(linkResult.edge?.label).toBe(EdgeType.GovernedBy);

    // Verify edge exists in graph
    const graph = await loadGraph(tempDir);
    const edge = graph.edges.find(
      e => e.source === decisionId && e.target === 'rule-project-claude-md-root'
    );

    expect(edge).toBeDefined();
    expect(edge?.label).toBe(EdgeType.GovernedBy);

    // Verify edge is retrievable via getEdges
    const allEdges = getEdges(graph);
    const governedByEdge = allEdges.find(
      e => e.source === decisionId && e.label === EdgeType.GovernedBy
    );

    expect(governedByEdge).toBeDefined();
    expect(governedByEdge?.target).toBe('rule-project-claude-md-root');
  });

  it('should link multiple decisions to same rule', async () => {
    // Create rule
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), '# Rules\nProject guidelines.');
    await syncMemories({ basePath: tempDir });

    // Create multiple decisions
    const decision1 = await writeMemory({
      title: 'Decision 1',
      type: MemoryType.Decision,
      content: 'First decision.',
      tags: [],
      scope: Scope.Project,
      basePath: tempDir,
    });

    const decision2 = await writeMemory({
      title: 'Decision 2',
      type: MemoryType.Decision,
      content: 'Second decision.',
      tags: [],
      scope: Scope.Project,
      basePath: tempDir,
    });

    // Link both to rule
    await linkMemories({
      source: decision1.memory!.id,
      target: 'rule-project-claude-md-root',
      relation: EdgeType.GovernedBy,
      basePath: tempDir,
    });

    await linkMemories({
      source: decision2.memory!.id,
      target: 'rule-project-claude-md-root',
      relation: EdgeType.GovernedBy,
      basePath: tempDir,
    });

    // Verify both edges exist
    const graph = await loadGraph(tempDir);
    const edges = graph.edges.filter(e => e.target === 'rule-project-claude-md-root');

    expect(edges.length).toBe(2);
    expect(edges.every(e => e.label === EdgeType.GovernedBy)).toBe(true);
  });

  it('should link decision to rules file in .claude/rules/', async () => {
    // Create rules file
    const rulesDir = path.join(tempDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'security.md'), '# Security Rules\nValidate all input.');

    await syncMemories({ basePath: tempDir });

    // Create decision
    const decision = await writeMemory({
      title: 'Input Validation Decision',
      type: MemoryType.Decision,
      content: 'We will validate all user input.',
      tags: ['security'],
      scope: Scope.Project,
      basePath: tempDir,
    });

    // Link to security rule
    const linkResult = await linkMemories({
      source: decision.memory!.id,
      target: 'rule-project-security',
      relation: EdgeType.GovernedBy,
      basePath: tempDir,
    });

    expect(linkResult.status).toBe('success');
    expect(linkResult.edge?.target).toBe('rule-project-security');
  });
});
