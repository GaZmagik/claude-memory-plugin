/**
 * T132: Integration test for audit excluding all external nodes
 *
 * End-to-end test verifying that audit commands exclude both rule and reminder nodes.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { auditMemories } from '../../skills/memory/src/quality/assess.js';
import { discoverRuleFiles, discoverReminderFiles } from '../../skills/memory/src/external/external-file-discovery.js';
import { indexExternalFiles } from '../../skills/memory/src/external/external-file-indexer.js';
import { saveGraph } from '../../skills/memory/src/graph/structure.js';
import { saveIndex } from '../../skills/memory/src/core/index.js';
import type { MemoryGraph, MemoryIndex } from '../../skills/memory/src/types/memory.js';

describe('T132: Integration - Audit Excludes External Nodes', () => {
  let tempDir: string;
  let baseGraph: MemoryGraph;
  let baseIndex: MemoryIndex;
  let embeddingsPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-integration-'));
    embeddingsPath = path.join(tempDir, 'embeddings.json');

    // Create directories
    fs.mkdirSync(path.join(tempDir, 'permanent'), { recursive: true });

    // Initialize structures
    baseGraph = {
      version: 1,
      nodes: [],
      edges: [],
    };

    baseIndex = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      memories: [],
    };

    fs.writeFileSync(embeddingsPath, JSON.stringify({}));

    // Create external files
    // 1. CLAUDE.md (rule)
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), '# Project Rules\nFollow TDD.');

    // 2. Agent MEMORY.md (reminder)
    const agentDir = path.join(tempDir, '.claude', 'agent-memory', 'test-agent');
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(path.join(agentDir, 'MEMORY.md'), '# Agent Memory\nTest patterns.');

    // 3. Regular memories
    const learningFile = `---
id: learning-tdd-patterns
title: TDD Patterns
type: learning
tags: [tdd]
created: 2026-02-19T10:00:00Z
updated: 2026-02-19T10:00:00Z
---

# TDD Patterns

Write tests first.
`;
    fs.writeFileSync(path.join(tempDir, 'permanent', 'learning-tdd-patterns.md'), learningFile);

    const decisionFile = `---
id: decision-use-vitest
title: Use Vitest
type: decision
tags: [testing]
created: 2026-02-19T09:00:00Z
updated: 2026-02-19T09:00:00Z
---

# Decision: Use Vitest

We will use Vitest for testing.
`;
    fs.writeFileSync(path.join(tempDir, 'permanent', 'decision-use-vitest.md'), decisionFile);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should exclude all external nodes (rules and reminders) from audit', async () => {
    // Index external files
    const rules = discoverRuleFiles({
      cwd: tempDir,
      homeDir: tempDir,
      gitRoot: tempDir,
    });

    const reminders = discoverReminderFiles({
      projectRoot: tempDir,
      homeDir: tempDir,
    });

    const allExternal = [...rules, ...reminders];

    await indexExternalFiles({
      basePath: tempDir,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      externalFiles: allExternal,
      dryRun: false,
    });

    // Save to disk
    await saveGraph(tempDir, baseGraph as any);
    await saveIndex(tempDir, baseIndex);

    // Run audit
    const result = await auditMemories({
      basePath: tempDir,
      threshold: 100,
      deep: false,
    });

    expect(result.status).toBe('success');

    // Should only scan the 2 regular memories, not the external nodes
    expect(result.scanned).toBe(2);

    // Results should not include external nodes
    const ruleResult = result.results.find(r => r.id.startsWith('rule-'));
    const reminderResult = result.results.find(r => r.id.startsWith('reminder-'));

    expect(ruleResult).toBeUndefined();
    expect(reminderResult).toBeUndefined();
  });

  it('should correctly count memory types excluding external nodes', async () => {
    // Index external files
    const rules = discoverRuleFiles({
      cwd: tempDir,
      homeDir: tempDir,
      gitRoot: tempDir,
    });

    const reminders = discoverReminderFiles({
      projectRoot: tempDir,
      homeDir: tempDir,
    });

    await indexExternalFiles({
      basePath: tempDir,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      externalFiles: [...rules, ...reminders],
      dryRun: false,
    });

    await saveGraph(tempDir, baseGraph as any);
    await saveIndex(tempDir, baseIndex);

    // Run audit
    const result = await auditMemories({
      basePath: tempDir,
      threshold: 100,
      deep: false,
    });

    expect(result.status).toBe('success');

    // Summary should reflect only regular memories
    const totalCategorized =
      result.summary.excellent +
      result.summary.good +
      result.summary.needsAttention +
      result.summary.poor +
      result.summary.critical;

    expect(totalCategorized).toBe(2); // Only the 2 regular memories
  });
});
