/**
 * T130: Unit test for audit command skipping rule nodes
 *
 * Verifies that auditMemories filters out rule nodes before auditing.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { auditMemories } from './assess.js';
import { MemoryType, Scope } from '../types/enums.js';
import { unsafeAsMemoryId } from '../types/branded.js';

describe('T130: Audit Command - Skip Rule Nodes', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-test-'));

    // Create directories
    fs.mkdirSync(path.join(tempDir, 'permanent'), { recursive: true });

    // Create graph with rule node and regular memory
    const graph = {
      version: 1,
      nodes: [
        {
          id: unsafeAsMemoryId('rule-project-claude-md-root'),
          type: MemoryType.Rule,
          title: 'CLAUDE.md',
          scope: Scope.Project,
        },
        {
          id: unsafeAsMemoryId('learning-tdd-patterns'),
          type: MemoryType.Learning,
          title: 'TDD Patterns',
          scope: Scope.Project,
        },
      ],
      edges: [],
    };

    fs.writeFileSync(path.join(tempDir, 'graph.json'), JSON.stringify(graph, null, 2));

    // Create regular memory file (learning)
    const learningFile = `---
id: learning-tdd-patterns
title: TDD Patterns
type: learning
tags: [tdd]
created: 2026-02-19T10:00:00Z
updated: 2026-02-19T10:00:00Z
---

# TDD Patterns

Always write tests first.
`;
    fs.writeFileSync(path.join(tempDir, 'permanent', 'learning-tdd-patterns.md'), learningFile);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should exclude rule nodes from audit', async () => {
    const result = await auditMemories({
      basePath: tempDir,
      threshold: 100,
      deep: false,
    });

    expect(result.status).toBe('success');

    // Should only audit the learning node, not the rule node
    // Even with threshold 100 (show all), rule nodes should not appear
    const ruleResult = result.results.find(r => r.id === 'rule-project-claude-md-root');
    expect(ruleResult).toBeUndefined();
  });

  it('should audit regular memories but skip rule nodes', async () => {
    const result = await auditMemories({
      basePath: tempDir,
      threshold: 100,
      deep: false,
    });

    expect(result.status).toBe('success');
    // Should scan both but only report on the regular memory
    expect(result.scanned).toBe(1); // Only learning node scanned
  });
});
