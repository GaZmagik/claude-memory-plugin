/**
 * T145: Integration test for Mermaid rendering rule nodes as hexagons
 *
 * Verifies that rule nodes are rendered with hexagon shapes {{node}} in
 * Mermaid diagrams.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { syncMemories } from '../../skills/memory/src/maintenance/sync.js';
import { generateMermaid } from '../../skills/memory/src/graph/mermaid.js';
import { loadGraph } from '../../skills/memory/src/graph/structure.js';

describe('T145: Mermaid renders rule nodes as hexagons', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mermaid-rule-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should render CLAUDE.md rule node with hexagon shape', async () => {
    // Create and index CLAUDE.md
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), '# Project Rules\nGuidelines.');
    await syncMemories({ basePath: tempDir });

    // Load graph and render Mermaid
    const graph = await loadGraph(tempDir);
    const mermaid = generateMermaid(graph);

    // Verify hexagon syntax {{node}} for rule node
    expect(mermaid).toContain('rule-project-claude-md-root{{');
    expect(mermaid).toMatch(/rule-project-claude-md-root\{\{.*\}\}/);
  });

  it('should render rules file node with hexagon shape', async () => {
    // Create rules file
    const rulesDir = path.join(tempDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'security.md'), '# Security Rules');

    await syncMemories({ basePath: tempDir });

    // Render Mermaid
    const graph = await loadGraph(tempDir);
    const mermaid = generateMermaid(graph);

    // Verify hexagon shape for rules file
    expect(mermaid).toContain('rule-project-security{{');
    expect(mermaid).toMatch(/rule-project-security\{\{.*\}\}/);
  });

  it('should render multiple rule nodes with hexagon shapes', async () => {
    // Create multiple rules
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), '# Main Rules');

    const rulesDir = path.join(tempDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'security.md'), '# Security');
    fs.writeFileSync(path.join(rulesDir, 'testing.md'), '# Testing');

    await syncMemories({ basePath: tempDir });

    // Render Mermaid
    const graph = await loadGraph(tempDir);
    const mermaid = generateMermaid(graph);

    // Verify all rule nodes use hexagons
    expect(mermaid).toMatch(/rule-project-claude-md-root\{\{.*\}\}/);
    expect(mermaid).toMatch(/rule-project-security\{\{.*\}\}/);
    expect(mermaid).toMatch(/rule-project-testing\{\{.*\}\}/);

    // Count hexagon shapes - should be at least 3 (one for each rule)
    const hexagonCount = (mermaid.match(/\{\{.*?\}\}/g) || []).length;
    expect(hexagonCount).toBeGreaterThanOrEqual(3);
  });

  it('should apply rule-specific styling to rule nodes', async () => {
    // Create rule node
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), '# Rules');
    await syncMemories({ basePath: tempDir });

    // Render Mermaid
    const graph = await loadGraph(tempDir);
    const mermaid = generateMermaid(graph);

    // Rule node should use hexagon {{}}
    expect(mermaid).toMatch(/rule-project-claude-md-root\{\{.*\}\}/);

    // Should have rule class definition
    expect(mermaid).toContain('classDef rule');

    // Should apply rule class to the node
    expect(mermaid).toContain('class rule-project-claude-md-root rule');
  });
});
