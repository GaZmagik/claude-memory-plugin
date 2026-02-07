/**
 * Tests for copy.ts - Agent copying operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { copyAgent } from './copy.js';
import type { CopyAgentRequest } from './types.js';
import { Scope } from '../../types/enums.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('copyAgent', () => {
  let tempDir: string;
  let projectRoot: string;
  let globalRoot: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-copy-test-'));
    projectRoot = path.join(tempDir, 'project');
    globalRoot = path.join(tempDir, 'global', '.claude', 'memory');

    fs.mkdirSync(projectRoot, { recursive: true });
    fs.mkdirSync(globalRoot, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('basic copying', () => {
    it('copies agent with memories to new name', async () => {
      // Create source agent
      const sourcePath = path.join(projectRoot, '.claude', 'memory', 'agents', 'source-agent');
      const sourcePermanent = path.join(sourcePath, 'permanent');
      fs.mkdirSync(sourcePermanent, { recursive: true });

      fs.writeFileSync(
        path.join(sourcePermanent, 'learning-test.md'),
        `---
type: learning
title: Test Learning
created: 2026-01-01T00:00:00.000Z
updated: 2026-01-01T00:00:00.000Z
tags: [test, copy]
scope: agent-project
agent: source-agent
---
Test content`
      );

      fs.writeFileSync(
        path.join(sourcePath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: '2026-01-01T00:00:00.000Z',
          memories: [{
            id: 'learning-test',
            type: 'learning',
            title: 'Test Learning',
            tags: ['test', 'copy'],
            created: '2026-01-01T00:00:00.000Z',
            updated: '2026-01-01T00:00:00.000Z',
            scope: 'agent-project',
            relativePath: 'permanent/learning-test.md',
          }],
        })
      );

      fs.writeFileSync(
        path.join(sourcePath, 'graph.json'),
        JSON.stringify({
          nodes: [{ id: 'learning-test', type: 'learning' }],
          edges: [],
        })
      );

      const request: CopyAgentRequest = {
        source: 'source-agent',
        target: 'target-agent',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      const result = await copyAgent(request);

      expect(result.status).toBe('success');
      expect(result.source).toBe('source-agent');
      expect(result.target).toBe('target-agent');
      expect(result.memoriesCopied).toBe(1);

      // Verify target exists
      const targetPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'target-agent');
      expect(fs.existsSync(targetPath)).toBe(true);
      expect(fs.existsSync(path.join(targetPath, 'permanent', 'learning-test.md'))).toBe(true);

      // Verify source still exists
      expect(fs.existsSync(sourcePath)).toBe(true);
    });

    it('copies empty agent', async () => {
      const sourcePath = path.join(projectRoot, '.claude', 'memory', 'agents', 'empty-source');
      fs.mkdirSync(sourcePath, { recursive: true });

      fs.writeFileSync(
        path.join(sourcePath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [],
        })
      );

      fs.writeFileSync(
        path.join(sourcePath, 'graph.json'),
        JSON.stringify({ nodes: [], edges: [] })
      );

      const request: CopyAgentRequest = {
        source: 'empty-source',
        target: 'empty-target',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      const result = await copyAgent(request);

      expect(result.status).toBe('success');
      expect(result.memoriesCopied).toBe(0);

      const targetPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'empty-target');
      expect(fs.existsSync(targetPath)).toBe(true);
    });
  });

  describe('metadata preservation', () => {
    it('preserves timestamps when copying', async () => {
      // Create source with rich metadata
      const sourcePath = path.join(projectRoot, '.claude', 'memory', 'agents', 'metadata-source');
      const sourcePermanent = path.join(sourcePath, 'permanent');
      fs.mkdirSync(sourcePermanent, { recursive: true });

      const originalCreated = '2026-01-01T10:30:00.000Z';
      const originalUpdated = '2026-01-02T15:45:00.000Z';

      fs.writeFileSync(
        path.join(sourcePermanent, 'decision-metadata.md'),
        `---
type: decision
title: Important Decision
created: ${originalCreated}
updated: ${originalUpdated}
tags: [architecture, performance]
links: [learning-related]
scope: agent-project
agent: metadata-source
---
Decision content`
      );

      fs.writeFileSync(
        path.join(sourcePath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: originalUpdated,
          memories: [{
            id: 'decision-metadata',
            type: 'decision',
            title: 'Important Decision',
            tags: ['architecture', 'performance'],
            links: ['learning-related'],
            created: originalCreated,
            updated: originalUpdated,
            scope: 'agent-project',
            relativePath: 'permanent/decision-metadata.md',
          }],
        })
      );

      fs.writeFileSync(
        path.join(sourcePath, 'graph.json'),
        JSON.stringify({ nodes: [], edges: [] })
      );

      const request: CopyAgentRequest = {
        source: 'metadata-source',
        target: 'metadata-target',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await copyAgent(request);

      // Verify metadata preserved
      const targetPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'metadata-target');
      const targetFile = fs.readFileSync(
        path.join(targetPath, 'permanent', 'decision-metadata.md'),
        'utf-8'
      );

      // YAML serialises ISO dates with quotes
      expect(targetFile).toContain(`created: "${originalCreated}"`);
      expect(targetFile).toContain(`updated: "${originalUpdated}"`);
    });

    it('preserves tags when copying', async () => {
      const sourcePath = path.join(projectRoot, '.claude', 'memory', 'agents', 'tag-source');
      const sourcePermanent = path.join(sourcePath, 'permanent');
      fs.mkdirSync(sourcePermanent, { recursive: true });

      fs.writeFileSync(
        path.join(sourcePermanent, 'learning-tagged-memory.md'),
        `---
type: learning
title: Tagged Memory
created: 2026-01-01T00:00:00.000Z
updated: 2026-01-01T00:00:00.000Z
tags: [typescript, patterns, advanced]
scope: agent-project
agent: tag-source
---
Content`
      );

      fs.writeFileSync(
        path.join(sourcePath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [{
            id: 'learning-tagged-memory',
            type: 'learning',
            tags: ['typescript', 'patterns', 'advanced'],
            relativePath: 'permanent/learning-tagged-memory.md',
          }],
        })
      );

      fs.writeFileSync(
        path.join(sourcePath, 'graph.json'),
        JSON.stringify({ nodes: [], edges: [] })
      );

      const request: CopyAgentRequest = {
        source: 'tag-source',
        target: 'tag-target',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await copyAgent(request);

      const targetPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'tag-target');
      const targetFile = fs.readFileSync(
        path.join(targetPath, 'permanent', 'learning-tagged-memory.md'),
        'utf-8'
      );

      // YAML serialises arrays in multi-line format, check for tag presence
      expect(targetFile).toContain('tags:');
      expect(targetFile).toContain('  - typescript');
      expect(targetFile).toContain('  - patterns');
      expect(targetFile).toContain('  - advanced');
    });

    it('preserves links when copying', async () => {
      const sourcePath = path.join(projectRoot, '.claude', 'memory', 'agents', 'link-source');
      const sourcePermanent = path.join(sourcePath, 'permanent');
      fs.mkdirSync(sourcePermanent, { recursive: true });

      fs.writeFileSync(
        path.join(sourcePermanent, 'decision-linked-memory.md'),
        `---
type: decision
title: Linked Decision
created: 2026-01-01T00:00:00.000Z
updated: 2026-01-01T00:00:00.000Z
tags: []
links: [related-learning, background-info]
scope: agent-project
agent: link-source
---
Content`
      );

      fs.writeFileSync(
        path.join(sourcePath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [{
            id: 'decision-linked-memory',
            type: 'decision',
            links: ['related-learning', 'background-info'],
            relativePath: 'permanent/decision-linked-memory.md',
          }],
        })
      );

      fs.writeFileSync(
        path.join(sourcePath, 'graph.json'),
        JSON.stringify({ nodes: [], edges: [] })
      );

      const request: CopyAgentRequest = {
        source: 'link-source',
        target: 'link-target',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await copyAgent(request);

      const targetPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'link-target');
      const targetFile = fs.readFileSync(
        path.join(targetPath, 'permanent', 'decision-linked-memory.md'),
        'utf-8'
      );

      // YAML serialises arrays in multi-line format, check for link presence
      expect(targetFile).toContain('links:');
      expect(targetFile).toContain('  - related-learning');
      expect(targetFile).toContain('  - background-info');
    });

    it('copies graph structure', async () => {
      const sourcePath = path.join(projectRoot, '.claude', 'memory', 'agents', 'graph-source');
      fs.mkdirSync(sourcePath, { recursive: true });
      fs.mkdirSync(path.join(sourcePath, 'permanent'), { recursive: true });

      // Create index with two memories
      fs.writeFileSync(
        path.join(sourcePath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [
            {
              id: 'learning-node-1',
              type: 'learning',
              title: 'Node 1',
              tags: ['test'],
              created: '2026-01-01T00:00:00.000Z',
              updated: '2026-01-01T00:00:00.000Z',
              scope: 'agent-project',
              relativePath: 'permanent/learning-node-1.md',
            },
            {
              id: 'decision-node-2',
              type: 'decision',
              title: 'Node 2',
              tags: ['test'],
              created: '2026-01-01T00:00:00.000Z',
              updated: '2026-01-01T00:00:00.000Z',
              scope: 'agent-project',
              relativePath: 'permanent/decision-node-2.md',
            },
          ],
        })
      );

      // Create memory files
      fs.writeFileSync(
        path.join(sourcePath, 'permanent', 'learning-node-1.md'),
        '---\nid: learning-node-1\ntitle: Node 1\ntype: learning\ncreated: "2026-01-01T00:00:00.000Z"\nupdated: "2026-01-01T00:00:00.000Z"\ntags:\n  - test\n---\n\nContent 1\n'
      );
      fs.writeFileSync(
        path.join(sourcePath, 'permanent', 'decision-node-2.md'),
        '---\nid: decision-node-2\ntitle: Node 2\ntype: decision\ncreated: "2026-01-01T00:00:00.000Z"\nupdated: "2026-01-01T00:00:00.000Z"\ntags:\n  - test\n---\n\nContent 2\n'
      );

      // Create graph with nodes and edges
      const graphData = {
        version: 1,
        nodes: [
          { id: 'learning-node-1', title: 'Node 1' },
          { id: 'decision-node-2', title: 'Node 2' },
        ],
        edges: [
          { source: 'learning-node-1', target: 'decision-node-2', label: 'relates-to' },
        ],
      };

      fs.writeFileSync(
        path.join(sourcePath, 'graph.json'),
        JSON.stringify(graphData)
      );

      const request: CopyAgentRequest = {
        source: 'graph-source',
        target: 'graph-target',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await copyAgent(request);

      const targetPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'graph-target');
      const targetGraph = JSON.parse(
        fs.readFileSync(path.join(targetPath, 'graph.json'), 'utf-8')
      );

      expect(targetGraph.nodes).toHaveLength(2);
      expect(targetGraph.edges).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('throws error when source agent not found', async () => {
      const request: CopyAgentRequest = {
        source: 'nonexistent-source',
        target: 'new-target',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await expect(copyAgent(request)).rejects.toThrow('Source agent not found');
    });

    it('throws error when target already exists without --force', async () => {
      // Create both source and target
      const sourcePath = path.join(projectRoot, '.claude', 'memory', 'agents', 'existing-source');
      const targetPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'existing-target');

      fs.mkdirSync(sourcePath, { recursive: true });
      fs.mkdirSync(targetPath, { recursive: true });

      fs.writeFileSync(
        path.join(sourcePath, 'index.json'),
        JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] })
      );
      fs.writeFileSync(
        path.join(targetPath, 'index.json'),
        JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] })
      );

      fs.writeFileSync(
        path.join(sourcePath, 'graph.json'),
        JSON.stringify({ nodes: [], edges: [] })
      );

      const request: CopyAgentRequest = {
        source: 'existing-source',
        target: 'existing-target',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        force: false,
      };

      await expect(copyAgent(request)).rejects.toThrow('Target agent already exists');
    });

    it('provides clear error message for source not found', async () => {
      const request: CopyAgentRequest = {
        source: 'missing',
        target: 'new',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await expect(copyAgent(request)).rejects.toThrow(/not found/i);
    });
  });

  describe('force merge', () => {
    it('merges into existing target when --force provided', async () => {
      // Create source with memory
      const sourcePath = path.join(projectRoot, '.claude', 'memory', 'agents', 'merge-source');
      const sourcePermanent = path.join(sourcePath, 'permanent');
      fs.mkdirSync(sourcePermanent, { recursive: true });

      fs.writeFileSync(
        path.join(sourcePermanent, 'learning-source-memory.md'),
        `---
type: learning
title: Source Memory
created: 2026-01-01T00:00:00.000Z
updated: 2026-01-01T00:00:00.000Z
tags: []
scope: agent-project
agent: merge-source
---
Content`
      );

      fs.writeFileSync(
        path.join(sourcePath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [{
            id: 'learning-source-memory',
            type: 'learning',
            relativePath: 'permanent/learning-source-memory.md',
          }],
        })
      );

      fs.writeFileSync(
        path.join(sourcePath, 'graph.json'),
        JSON.stringify({ nodes: [], edges: [] })
      );

      // Create target with different memory
      const targetPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'merge-target');
      const targetPermanent = path.join(targetPath, 'permanent');
      fs.mkdirSync(targetPermanent, { recursive: true });

      fs.writeFileSync(
        path.join(targetPermanent, 'decision-target-memory.md'),
        `---
type: decision
title: Target Memory
created: 2026-01-01T00:00:00.000Z
updated: 2026-01-01T00:00:00.000Z
tags: []
scope: agent-project
agent: merge-target
---
Content`
      );

      fs.writeFileSync(
        path.join(targetPath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [{
            id: 'decision-target-memory',
            type: 'decision',
            relativePath: 'permanent/decision-target-memory.md',
          }],
        })
      );

      fs.writeFileSync(
        path.join(targetPath, 'graph.json'),
        JSON.stringify({ nodes: [], edges: [] })
      );

      const request: CopyAgentRequest = {
        source: 'merge-source',
        target: 'merge-target',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        force: true,
      };

      const result = await copyAgent(request);

      expect(result.status).toBe('success');

      // Verify both memories exist in target
      expect(fs.existsSync(path.join(targetPath, 'permanent', 'learning-source-memory.md'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, 'permanent', 'decision-target-memory.md'))).toBe(true);
    });
  });

  describe('dry-run mode', () => {
    it('previews copy without creating target', async () => {
      // Create source
      const sourcePath = path.join(projectRoot, '.claude', 'memory', 'agents', 'preview-source');
      const sourcePermanent = path.join(sourcePath, 'permanent');
      fs.mkdirSync(sourcePermanent, { recursive: true });

      // Create actual memory file
      fs.writeFileSync(
        path.join(sourcePermanent, 'test.md'),
        `---
type: learning
title: Test Memory
created: 2026-01-01T00:00:00.000Z
updated: 2026-01-01T00:00:00.000Z
tags: [test]
scope: agent-project
agent: preview-source
---
Test content`
      );

      fs.writeFileSync(
        path.join(sourcePath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [{ id: 'test', type: 'learning', relativePath: 'permanent/test.md' }],
        })
      );
      fs.writeFileSync(
        path.join(sourcePath, 'graph.json'),
        JSON.stringify({ nodes: [], edges: [] })
      );

      const request: CopyAgentRequest = {
        source: 'preview-source',
        target: 'preview-target',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        dryRun: true,
      };

      const result = await copyAgent(request);

      expect(result.status).toBe('success');
      expect(result.dryRun).toBe(true);
      expect(result.memoriesCopied).toBe(1);

      // Verify target was not created
      const targetPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'preview-target');
      expect(fs.existsSync(targetPath)).toBe(false);
    });

    it('validates source exists in dry-run mode', async () => {
      const request: CopyAgentRequest = {
        source: 'nonexistent',
        target: 'new-target',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        dryRun: true,
      };

      await expect(copyAgent(request)).rejects.toThrow('Source agent not found');
    });

    it('reports memory count in dry-run', async () => {
      const sourcePath = path.join(projectRoot, '.claude', 'memory', 'agents', 'count-source');
      const sourcePermanent = path.join(sourcePath, 'permanent');
      fs.mkdirSync(sourcePermanent, { recursive: true });

      // Create actual memory files
      fs.writeFileSync(
        path.join(sourcePermanent, 'learning-mem-1.md'),
        `---
type: learning
title: Memory 1
created: 2026-01-01T00:00:00.000Z
updated: 2026-01-01T00:00:00.000Z
tags: []
scope: agent-project
agent: count-source
---
Content 1`
      );

      fs.writeFileSync(
        path.join(sourcePermanent, 'decision-mem-2.md'),
        `---
type: decision
title: Memory 2
created: 2026-01-01T00:00:00.000Z
updated: 2026-01-01T00:00:00.000Z
tags: []
scope: agent-project
agent: count-source
---
Content 2`
      );

      fs.writeFileSync(
        path.join(sourcePermanent, 'gotcha-mem-3.md'),
        `---
type: gotcha
title: Memory 3
created: 2026-01-01T00:00:00.000Z
updated: 2026-01-01T00:00:00.000Z
tags: []
scope: agent-project
agent: count-source
---
Content 3`
      );

      fs.writeFileSync(
        path.join(sourcePath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [
            { id: 'learning-mem-1', type: 'learning', relativePath: 'permanent/learning-mem-1.md' },
            { id: 'decision-mem-2', type: 'decision', relativePath: 'permanent/decision-mem-2.md' },
            { id: 'gotcha-mem-3', type: 'gotcha', relativePath: 'permanent/gotcha-mem-3.md' },
          ],
        })
      );
      fs.writeFileSync(
        path.join(sourcePath, 'graph.json'),
        JSON.stringify({ nodes: [], edges: [] })
      );

      const request: CopyAgentRequest = {
        source: 'count-source',
        target: 'count-target',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        dryRun: true,
      };

      const result = await copyAgent(request);

      expect(result.memoriesCopied).toBe(3);
    });
  });

  describe('scope handling', () => {
    it('copies within project scope', async () => {
      const sourcePath = path.join(projectRoot, '.claude', 'memory', 'agents', 'project-source');
      fs.mkdirSync(sourcePath, { recursive: true });
      fs.writeFileSync(
        path.join(sourcePath, 'index.json'),
        JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] })
      );
      fs.writeFileSync(
        path.join(sourcePath, 'graph.json'),
        JSON.stringify({ nodes: [], edges: [] })
      );

      const request: CopyAgentRequest = {
        source: 'project-source',
        target: 'project-target',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await copyAgent(request);

      const targetPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'project-target');
      expect(fs.existsSync(targetPath)).toBe(true);

      // Verify not in global
      const globalTargetPath = path.join(globalRoot, 'agents', 'project-target');
      expect(fs.existsSync(globalTargetPath)).toBe(false);
    });

    it('copies within global scope', async () => {
      const sourcePath = path.join(globalRoot, 'agents', 'global-source');
      fs.mkdirSync(sourcePath, { recursive: true });
      fs.writeFileSync(
        path.join(sourcePath, 'index.json'),
        JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] })
      );
      fs.writeFileSync(
        path.join(sourcePath, 'graph.json'),
        JSON.stringify({ nodes: [], edges: [] })
      );

      const request: CopyAgentRequest = {
        source: 'global-source',
        target: 'global-target',
        scope: Scope.AgentGlobal,
        projectRoot,
        globalRoot,
      };

      await copyAgent(request);

      const targetPath = path.join(globalRoot, 'agents', 'global-target');
      expect(fs.existsSync(targetPath)).toBe(true);

      // Verify not in project
      const projectTargetPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'global-target');
      expect(fs.existsSync(projectTargetPath)).toBe(false);
    });
  });
});
