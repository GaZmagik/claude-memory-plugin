/**
 * T131: Unit test for audit command skipping reminder nodes
 *
 * Verifies that auditMemories filters out reminder nodes before auditing.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { auditMemories } from './assess.js';
import { MemoryType, Scope } from '../types/enums.js';
import { unsafeAsMemoryId } from '../types/branded.js';

describe('T131: Audit Command - Skip Reminder Nodes', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-test-'));

    // Create directories
    fs.mkdirSync(path.join(tempDir, 'permanent'), { recursive: true });

    // Create graph with reminder node and regular memory
    const graph = {
      version: 1,
      nodes: [
        {
          id: unsafeAsMemoryId('reminder-project-typescript-expert-memory'),
          type: MemoryType.Reminder,
          title: 'TypeScript Expert Memory',
          scope: Scope.AgentProject,
          agent: 'typescript-expert',
        },
        {
          id: unsafeAsMemoryId('gotcha-typescript-strict-mode'),
          type: MemoryType.Gotcha,
          title: 'TypeScript Strict Mode',
          scope: Scope.Project,
        },
      ],
      edges: [],
    };

    fs.writeFileSync(path.join(tempDir, 'graph.json'), JSON.stringify(graph, null, 2));

    // Create regular memory file (gotcha)
    const gotchaFile = `---
id: gotcha-typescript-strict-mode
title: TypeScript Strict Mode
type: gotcha
tags: [typescript]
created: 2026-02-19T10:00:00Z
updated: 2026-02-19T10:00:00Z
---

# TypeScript Strict Mode

Always enable strict mode.
`;
    fs.writeFileSync(path.join(tempDir, 'permanent', 'gotcha-typescript-strict-mode.md'), gotchaFile);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should exclude reminder nodes from audit', async () => {
    const result = await auditMemories({
      basePath: tempDir,
      threshold: 100,
      deep: false,
    });

    expect(result.status).toBe('success');

    // Should only audit the gotcha node, not the reminder node
    const reminderResult = result.results.find(r => r.id === 'reminder-project-typescript-expert-memory');
    expect(reminderResult).toBeUndefined();
  });

  it('should audit regular memories but skip reminder nodes', async () => {
    const result = await auditMemories({
      basePath: tempDir,
      threshold: 100,
      deep: false,
    });

    expect(result.status).toBe('success');
    // Should scan only the gotcha node
    expect(result.scanned).toBe(1);
  });
});
