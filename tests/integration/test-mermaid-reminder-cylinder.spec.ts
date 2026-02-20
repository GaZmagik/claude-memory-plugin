/**
 * T146: Integration test for Mermaid rendering reminder nodes as subroutines
 *
 * Verifies that reminder nodes are rendered with subroutine shapes [[node]] in
 * Mermaid diagrams (double square brackets).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { syncMemories } from '../../skills/memory/src/maintenance/sync.js';
import { generateMermaid } from '../../skills/memory/src/graph/mermaid.js';
import { loadGraph } from '../../skills/memory/src/graph/structure.js';

describe('T146: Mermaid renders reminder nodes as subroutines', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mermaid-reminder-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should render agent MEMORY.md reminder node with subroutine shape', async () => {
    // Create and index agent MEMORY.md
    const agentDir = path.join(tempDir, '.claude', 'agent-memory', 'test-agent');
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(path.join(agentDir, 'MEMORY.md'), '# Test Agent Memory');

    await syncMemories({ basePath: tempDir });

    // Load graph and render Mermaid
    const graph = await loadGraph(tempDir);
    const mermaid = generateMermaid(graph);

    // Verify subroutine syntax [[node)] for reminder node
    expect(mermaid).toContain('reminder-project-test-agent-memory[[');
    expect(mermaid).toMatch(/reminder-project-test-agent-memory\[\[.*\]\]/);
  });

  it('should render agent sub-file reminder node with subroutine shape', async () => {
    // Create agent sub-file
    const agentDir = path.join(tempDir, '.claude', 'agent-memory', 'typescript-expert');
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(path.join(agentDir, 'patterns.md'), '# TypeScript Patterns');

    await syncMemories({ basePath: tempDir });

    // Render Mermaid
    const graph = await loadGraph(tempDir);
    const mermaid = generateMermaid(graph);

    // Verify subroutine shape for agent sub-file
    expect(mermaid).toContain('reminder-project-typescript-expert-patterns[[');
    expect(mermaid).toMatch(/reminder-project-typescript-expert-patterns\[\[.*\]\]/);
  });

  it('should render multiple reminder nodes with subroutine shapes', async () => {
    // Create multiple reminders
    const agents = ['agent-a', 'agent-b', 'agent-c'];

    for (const agent of agents) {
      const agentDir = path.join(tempDir, '.claude', 'agent-memory', agent);
      fs.mkdirSync(agentDir, { recursive: true });
      fs.writeFileSync(path.join(agentDir, 'MEMORY.md'), `# ${agent} Memory`);
    }

    await syncMemories({ basePath: tempDir });

    // Render Mermaid
    const graph = await loadGraph(tempDir);
    const mermaid = generateMermaid(graph);

    // Verify all reminder nodes use subroutines
    expect(mermaid).toMatch(/reminder-project-agent-a-memory\[\[.*\]\]/);
    expect(mermaid).toMatch(/reminder-project-agent-b-memory\[\[.*\]\]/);
    expect(mermaid).toMatch(/reminder-project-agent-c-memory\[\[.*\]\]/);

    // Count subroutine shapes - should be at least 3
    const subroutineCount = (mermaid.match(/\[\[.*?\]\]/g) || []).length;
    expect(subroutineCount).toBeGreaterThanOrEqual(3);
  });

  it('should apply reminder-specific styling to reminder nodes', async () => {
    // Create reminder node
    const agentDir = path.join(tempDir, '.claude', 'agent-memory', 'test-agent');
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(path.join(agentDir, 'MEMORY.md'), '# Memory');

    await syncMemories({ basePath: tempDir });

    // Render Mermaid
    const graph = await loadGraph(tempDir);
    const mermaid = generateMermaid(graph);

    // Reminder node should use subroutine [[)]
    expect(mermaid).toMatch(/reminder-project-test-agent-memory\[\[.*\]\]/);

    // Should have reminder class definition
    expect(mermaid).toContain('classDef reminder');

    // Should apply agentNode class to the node (reminder nodes get agentNode styling)
    expect(mermaid).toContain('class reminder-project-test-agent-memory agentNode');
  });

  it('should render both rules and reminders with different shapes', async () => {
    // Create rule
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), '# Rules');

    // Create reminder
    const agentDir = path.join(tempDir, '.claude', 'agent-memory', 'test-agent');
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(path.join(agentDir, 'MEMORY.md'), '# Memory');

    await syncMemories({ basePath: tempDir });

    // Render Mermaid
    const graph = await loadGraph(tempDir);
    const mermaid = generateMermaid(graph);

    // Rule should use hexagon {{}}
    expect(mermaid).toMatch(/rule-project-claude-md-root\{\{.*\}\}/);

    // Reminder should use subroutine [[)]
    expect(mermaid).toMatch(/reminder-project-test-agent-memory\[\[.*\]\]/);

    // Should have both class definitions
    expect(mermaid).toContain('classDef rule');
    expect(mermaid).toContain('classDef reminder');
  });
});
