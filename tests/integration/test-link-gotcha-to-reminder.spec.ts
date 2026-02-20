/**
 * T144: Integration test for linking gotcha to reminder with reminded-by edge
 *
 * Verifies that gotchas can be linked to reminder nodes using the reminded-by edge type,
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

describe('T144: Link gotcha to reminder with reminded-by edge', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'link-gotcha-reminder-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should link gotcha to reminder node with reminded-by edge', async () => {
    // Create agent MEMORY.md reminder
    const agentDir = path.join(tempDir, '.claude', 'agent-memory', 'typescript-expert');
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(
      path.join(agentDir, 'MEMORY.md'),
      '# TypeScript Expert Memory\n\nCommon patterns and gotchas.'
    );

    // Sync to index reminder
    await syncMemories({ basePath: tempDir });

    // Create a gotcha memory
    const gotchaResult = await writeMemory({
      title: 'Avoid Any Type',
      type: MemoryType.Gotcha,
      content: '# Gotcha\n\nUsing `any` type defeats TypeScript\'s type safety.',
      tags: ['typescript', 'types'],
      scope: Scope.Project,
      basePath: tempDir,
    });

    expect(gotchaResult.status).toBe('success');
    const gotchaId = gotchaResult.memory?.id!;

    // Link gotcha to reminder with reminded-by edge
    const linkResult = await linkMemories({
      source: gotchaId,
      target: 'reminder-project-typescript-expert-memory',
      relation: EdgeType.RemindedBy,
      basePath: tempDir,
    });

    expect(linkResult.status).toBe('success');
    expect(linkResult.edge).toBeDefined();
    expect(linkResult.edge?.source).toBe(gotchaId);
    expect(linkResult.edge?.target).toBe('reminder-project-typescript-expert-memory');
    expect(linkResult.edge?.label).toBe(EdgeType.RemindedBy);

    // Verify edge exists in graph
    const graph = await loadGraph(tempDir);
    const edge = graph.edges.find(
      e => e.source === gotchaId && e.target === 'reminder-project-typescript-expert-memory'
    );

    expect(edge).toBeDefined();
    expect(edge?.label).toBe(EdgeType.RemindedBy);

    // Verify edge is retrievable via getEdges
    const allEdges = getEdges(graph);
    const remindedByEdge = allEdges.find(
      e => e.source === gotchaId && e.label === EdgeType.RemindedBy
    );

    expect(remindedByEdge).toBeDefined();
    expect(remindedByEdge?.target).toBe('reminder-project-typescript-expert-memory');
  });

  it('should link multiple gotchas to same reminder', async () => {
    // Create reminder
    const agentDir = path.join(tempDir, '.claude', 'agent-memory', 'rust-expert');
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(path.join(agentDir, 'MEMORY.md'), '# Rust Expert\nBorrowing rules.');

    await syncMemories({ basePath: tempDir });

    // Create multiple gotchas
    const gotcha1 = await writeMemory({
      title: 'Borrow Checker Gotcha',
      type: MemoryType.Gotcha,
      content: 'Mutable and immutable borrows.',
      tags: ['rust'],
      scope: Scope.Project,
      basePath: tempDir,
    });

    const gotcha2 = await writeMemory({
      title: 'Lifetime Gotcha',
      type: MemoryType.Gotcha,
      content: 'Lifetime annotations required.',
      tags: ['rust'],
      scope: Scope.Project,
      basePath: tempDir,
    });

    // Link both to reminder
    await linkMemories({
      source: gotcha1.memory!.id,
      target: 'reminder-project-rust-expert-memory',
      relation: EdgeType.RemindedBy,
      basePath: tempDir,
    });

    await linkMemories({
      source: gotcha2.memory!.id,
      target: 'reminder-project-rust-expert-memory',
      relation: EdgeType.RemindedBy,
      basePath: tempDir,
    });

    // Verify both edges exist
    const graph = await loadGraph(tempDir);
    const edges = graph.edges.filter(e => e.target === 'reminder-project-rust-expert-memory');

    expect(edges.length).toBe(2);
    expect(edges.every(e => e.label === EdgeType.RemindedBy)).toBe(true);
  });

  it('should link gotcha to agent sub-file reminder', async () => {
    // Create agent sub-file
    const agentDir = path.join(tempDir, '.claude', 'agent-memory', 'python-guru');
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(
      path.join(agentDir, 'gotchas.md'),
      '# Python Gotchas\nMutable default arguments.'
    );

    await syncMemories({ basePath: tempDir });

    // Create gotcha
    const gotcha = await writeMemory({
      title: 'Mutable Default Args',
      type: MemoryType.Gotcha,
      content: 'Never use mutable defaults in function definitions.',
      tags: ['python'],
      scope: Scope.Project,
      basePath: tempDir,
    });

    // Link to sub-file reminder
    const linkResult = await linkMemories({
      source: gotcha.memory!.id,
      target: 'reminder-project-python-guru-gotchas',
      relation: EdgeType.RemindedBy,
      basePath: tempDir,
    });

    expect(linkResult.status).toBe('success');
    expect(linkResult.edge?.target).toBe('reminder-project-python-guru-gotchas');
  });

  it('should link learning to reminder with reminded-by edge', async () => {
    // Create reminder
    const agentDir = path.join(tempDir, '.claude', 'agent-memory', 'test-agent');
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(path.join(agentDir, 'patterns.md'), '# Patterns\nBest practices.');

    await syncMemories({ basePath: tempDir });

    // Create learning
    const learning = await writeMemory({
      title: 'Factory Pattern Works Well',
      type: MemoryType.Learning,
      content: 'Factory pattern simplifies object creation.',
      tags: ['patterns'],
      scope: Scope.Project,
      basePath: tempDir,
    });

    // Link learning to reminder
    const linkResult = await linkMemories({
      source: learning.memory!.id,
      target: 'reminder-project-test-agent-patterns',
      relation: EdgeType.RemindedBy,
      basePath: tempDir,
    });

    expect(linkResult.status).toBe('success');
    expect(linkResult.edge?.label).toBe(EdgeType.RemindedBy);
  });
});
