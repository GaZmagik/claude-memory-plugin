/**
 * Tests for rename.ts - Agent renaming operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renameAgent } from './rename.js';
import type { RenameAgentRequest } from './types.js';
import { Scope } from '../../types/enums.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('renameAgent', () => {
  let tempDir: string;
  let projectRoot: string;
  let globalRoot: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-rename-test-'));
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

  describe('basic renaming', () => {
    it('renames agent directory', async () => {
      // Create agent
      const oldPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'old-name');
      fs.mkdirSync(oldPath, { recursive: true });
      fs.writeFileSync(
        path.join(oldPath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [],
        })
      );
      fs.writeFileSync(
        path.join(oldPath, 'graph.json'),
        JSON.stringify({ nodes: [], edges: [] })
      );

      const request: RenameAgentRequest = {
        oldName: 'old-name',
        newName: 'new-name',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      const result = await renameAgent(request);

      expect(result.status).toBe('success');
      expect(result.oldName).toBe('old-name');
      expect(result.newName).toBe('new-name');

      // Verify old path gone, new path exists
      expect(fs.existsSync(oldPath)).toBe(false);
      const newPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'new-name');
      expect(fs.existsSync(newPath)).toBe(true);
    });

    it('preserves directory contents during rename', async () => {
      const oldPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'preserve-test');
      const permanentPath = path.join(oldPath, 'permanent');
      const temporaryPath = path.join(oldPath, 'temporary');
      fs.mkdirSync(permanentPath, { recursive: true });
      fs.mkdirSync(temporaryPath, { recursive: true });

      fs.writeFileSync(
        path.join(permanentPath, 'test-memory.md'),
        `---
type: learning
title: Test Memory
---
Content`
      );

      fs.writeFileSync(
        path.join(oldPath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [{ id: 'test-memory', relativePath: 'permanent/test-memory.md' }],
        })
      );

      fs.writeFileSync(
        path.join(oldPath, 'graph.json'),
        JSON.stringify({ nodes: [], edges: [] })
      );

      const request: RenameAgentRequest = {
        oldName: 'preserve-test',
        newName: 'preserved-test',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await renameAgent(request);

      const newPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'preserved-test');
      expect(fs.existsSync(path.join(newPath, 'permanent'))).toBe(true);
      expect(fs.existsSync(path.join(newPath, 'temporary'))).toBe(true);
      expect(fs.existsSync(path.join(newPath, 'permanent', 'test-memory.md'))).toBe(true);
      expect(fs.existsSync(path.join(newPath, 'index.json'))).toBe(true);
      expect(fs.existsSync(path.join(newPath, 'graph.json'))).toBe(true);
    });
  });

  describe('frontmatter updates', () => {
    it('updates agent field in memory frontmatter', async () => {
      // Create agent with memory
      const oldPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'typescript-expert');
      const permanentPath = path.join(oldPath, 'permanent');
      fs.mkdirSync(permanentPath, { recursive: true });

      fs.writeFileSync(
        path.join(permanentPath, 'learning-types.md'),
        `---
type: learning
title: TypeScript Types
created: 2026-01-01T00:00:00.000Z
updated: 2026-01-01T00:00:00.000Z
tags: [typescript]
scope: agent-project
agent: typescript-expert
---
Content about types`
      );

      fs.writeFileSync(
        path.join(oldPath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [{
            id: 'learning-types',
            type: 'learning',
            title: 'TypeScript Types',
            relativePath: 'permanent/learning-types.md',
          }],
        })
      );

      fs.writeFileSync(
        path.join(oldPath, 'graph.json'),
        JSON.stringify({ nodes: [], edges: [] })
      );

      const request: RenameAgentRequest = {
        oldName: 'typescript-expert',
        newName: 'typescript-pro',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      const result = await renameAgent(request);

      expect(result.status).toBe('success');
      expect(result.memoriesUpdated).toBe(1);

      // Verify frontmatter updated
      const newPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'typescript-pro');
      const content = fs.readFileSync(
        path.join(newPath, 'permanent', 'learning-types.md'),
        'utf-8'
      );

      expect(content).toContain('agent: typescript-pro');
      expect(content).not.toContain('agent: typescript-expert');
    });

    it('updates multiple memory files', async () => {
      const oldPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'multi-memory');
      const permanentPath = path.join(oldPath, 'permanent');
      fs.mkdirSync(permanentPath, { recursive: true });

      // Create multiple memories
      fs.writeFileSync(
        path.join(permanentPath, 'memory-one.md'),
        `---
type: learning
title: Memory One
agent: multi-memory
created: "2026-01-01T00:00:00.000Z"
updated: "2026-01-01T00:00:00.000Z"
---
Content one`
      );

      fs.writeFileSync(
        path.join(permanentPath, 'memory-two.md'),
        `---
type: decision
title: Memory Two
agent: multi-memory
created: "2026-01-01T00:00:00.000Z"
updated: "2026-01-01T00:00:00.000Z"
---
Content two`
      );

      fs.writeFileSync(
        path.join(permanentPath, 'memory-three.md'),
        `---
type: artifact
title: Memory Three
agent: multi-memory
created: "2026-01-01T00:00:00.000Z"
updated: "2026-01-01T00:00:00.000Z"
---
Content three`
      );

      fs.writeFileSync(
        path.join(oldPath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [
            { id: 'memory-one', relativePath: 'permanent/memory-one.md' },
            { id: 'memory-two', relativePath: 'permanent/memory-two.md' },
            { id: 'memory-three', relativePath: 'permanent/memory-three.md' },
          ],
        })
      );

      fs.writeFileSync(
        path.join(oldPath, 'graph.json'),
        JSON.stringify({ nodes: [], edges: [] })
      );

      const request: RenameAgentRequest = {
        oldName: 'multi-memory',
        newName: 'renamed-multi',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      const result = await renameAgent(request);

      expect(result.memoriesUpdated).toBe(3);

      // Verify all frontmatter updated
      const newPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'renamed-multi');

      for (const filename of ['memory-one.md', 'memory-two.md', 'memory-three.md']) {
        const content = fs.readFileSync(path.join(newPath, 'permanent', filename), 'utf-8');
        expect(content).toContain('agent: renamed-multi');
        expect(content).not.toContain('agent: multi-memory');
      }
    });

    it('preserves other frontmatter fields when updating agent', async () => {
      const oldPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'preserve-fields');
      const permanentPath = path.join(oldPath, 'permanent');
      fs.mkdirSync(permanentPath, { recursive: true });

      const originalFrontmatter = `---
type: decision
title: Important Decision
created: 2026-01-01T10:00:00.000Z
updated: 2026-01-02T15:00:00.000Z
tags: [architecture, performance]
links: [related-memory]
scope: agent-project
agent: preserve-fields
---
Content`;

      fs.writeFileSync(
        path.join(permanentPath, 'decision.md'),
        originalFrontmatter
      );

      fs.writeFileSync(
        path.join(oldPath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [{ id: 'decision', relativePath: 'permanent/decision.md' }],
        })
      );

      fs.writeFileSync(
        path.join(oldPath, 'graph.json'),
        JSON.stringify({ nodes: [], edges: [] })
      );

      const request: RenameAgentRequest = {
        oldName: 'preserve-fields',
        newName: 'fields-preserved',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await renameAgent(request);

      const newPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'fields-preserved');
      const content = fs.readFileSync(path.join(newPath, 'permanent', 'decision.md'), 'utf-8');

      // Verify all other fields preserved
      expect(content).toContain('type: decision');
      expect(content).toContain('title: Important Decision');
      // YAML serialises ISO dates with quotes
      expect(content).toContain('created: "2026-01-01T10:00:00.000Z"');
      expect(content).toContain('updated: "2026-01-02T15:00:00.000Z"');
      // YAML serialises arrays in multi-line format
      expect(content).toContain('tags:');
      expect(content).toContain('  - architecture');
      expect(content).toContain('  - performance');
      expect(content).toContain('links:');
      expect(content).toContain('  - related-memory');
      expect(content).toContain('scope: agent-project');
      expect(content).toContain('agent: fields-preserved');
    });
  });

  describe('error handling', () => {
    it('throws error when old agent not found', async () => {
      const request: RenameAgentRequest = {
        oldName: 'nonexistent',
        newName: 'new-name',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await expect(renameAgent(request)).rejects.toThrow('Agent not found');
    });

    it('throws error when new name already exists', async () => {
      // Create both agents
      const agent1Path = path.join(projectRoot, '.claude', 'memory', 'agents', 'agent-one');
      const agent2Path = path.join(projectRoot, '.claude', 'memory', 'agents', 'agent-two');

      fs.mkdirSync(agent1Path, { recursive: true });
      fs.mkdirSync(agent2Path, { recursive: true });

      fs.writeFileSync(path.join(agent1Path, 'index.json'), JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] }));
      fs.writeFileSync(path.join(agent2Path, 'index.json'), JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] }));

      const request: RenameAgentRequest = {
        oldName: 'agent-one',
        newName: 'agent-two',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await expect(renameAgent(request)).rejects.toThrow('Target agent already exists');
    });

    it('provides clear error for missing agent', async () => {
      const request: RenameAgentRequest = {
        oldName: 'missing',
        newName: 'new',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await expect(renameAgent(request)).rejects.toThrow(/not found/i);
    });

    it('provides clear error for existing target', async () => {
      const agent1Path = path.join(projectRoot, '.claude', 'memory', 'agents', 'exists-1');
      const agent2Path = path.join(projectRoot, '.claude', 'memory', 'agents', 'exists-2');

      fs.mkdirSync(agent1Path, { recursive: true });
      fs.mkdirSync(agent2Path, { recursive: true });

      fs.writeFileSync(path.join(agent1Path, 'index.json'), '{}');
      fs.writeFileSync(path.join(agent2Path, 'index.json'), '{}');

      const request: RenameAgentRequest = {
        oldName: 'exists-1',
        newName: 'exists-2',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await expect(renameAgent(request)).rejects.toThrow(/already exists/i);
    });
  });

  describe('dry-run mode', () => {
    it('previews rename without modifying filesystem', async () => {
      // Create agent
      const oldPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'preview-old');
      fs.mkdirSync(oldPath, { recursive: true });
      fs.writeFileSync(
        path.join(oldPath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [{ id: 'test', relativePath: 'permanent/test.md' }],
        })
      );
      fs.writeFileSync(
        path.join(oldPath, 'graph.json'),
        JSON.stringify({ nodes: [], edges: [] })
      );

      const request: RenameAgentRequest = {
        oldName: 'preview-old',
        newName: 'preview-new',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        dryRun: true,
      };

      const result = await renameAgent(request);

      expect(result.status).toBe('success');
      expect(result.dryRun).toBe(true);
      expect(result.oldName).toBe('preview-old');
      expect(result.newName).toBe('preview-new');

      // Verify nothing changed
      expect(fs.existsSync(oldPath)).toBe(true);
      const newPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'preview-new');
      expect(fs.existsSync(newPath)).toBe(false);
    });

    it('validates old agent exists in dry-run', async () => {
      const request: RenameAgentRequest = {
        oldName: 'nonexistent',
        newName: 'new',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        dryRun: true,
      };

      await expect(renameAgent(request)).rejects.toThrow('Agent not found');
    });

    it('validates new name not taken in dry-run', async () => {
      const agent1Path = path.join(projectRoot, '.claude', 'memory', 'agents', 'dry-1');
      const agent2Path = path.join(projectRoot, '.claude', 'memory', 'agents', 'dry-2');

      fs.mkdirSync(agent1Path, { recursive: true });
      fs.mkdirSync(agent2Path, { recursive: true });

      fs.writeFileSync(path.join(agent1Path, 'index.json'), '{}');
      fs.writeFileSync(path.join(agent2Path, 'index.json'), '{}');

      const request: RenameAgentRequest = {
        oldName: 'dry-1',
        newName: 'dry-2',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        dryRun: true,
      };

      await expect(renameAgent(request)).rejects.toThrow('Target agent already exists');
    });

    it('reports memory count in dry-run', async () => {
      const oldPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'count-test');
      fs.mkdirSync(oldPath, { recursive: true });
      fs.writeFileSync(
        path.join(oldPath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [
            { id: 'mem-1', relativePath: 'permanent/mem-1.md' },
            { id: 'mem-2', relativePath: 'permanent/mem-2.md' },
          ],
        })
      );
      fs.writeFileSync(
        path.join(oldPath, 'graph.json'),
        JSON.stringify({ nodes: [], edges: [] })
      );

      const request: RenameAgentRequest = {
        oldName: 'count-test',
        newName: 'renamed-count',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        dryRun: true,
      };

      const result = await renameAgent(request);

      expect(result.memoriesUpdated).toBe(2);
    });
  });

  describe('scope handling', () => {
    it('renames agent in project scope', async () => {
      const oldPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'project-old');
      fs.mkdirSync(oldPath, { recursive: true });
      fs.writeFileSync(
        path.join(oldPath, 'index.json'),
        JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] })
      );
      fs.writeFileSync(
        path.join(oldPath, 'graph.json'),
        JSON.stringify({ nodes: [], edges: [] })
      );

      const request: RenameAgentRequest = {
        oldName: 'project-old',
        newName: 'project-new',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await renameAgent(request);

      expect(fs.existsSync(oldPath)).toBe(false);
      expect(fs.existsSync(path.join(projectRoot, '.claude', 'memory', 'agents', 'project-new'))).toBe(true);
    });

    it('renames agent in global scope', async () => {
      const oldPath = path.join(globalRoot, 'agents', 'global-old');
      fs.mkdirSync(oldPath, { recursive: true });
      fs.writeFileSync(
        path.join(oldPath, 'index.json'),
        JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] })
      );
      fs.writeFileSync(
        path.join(oldPath, 'graph.json'),
        JSON.stringify({ nodes: [], edges: [] })
      );

      const request: RenameAgentRequest = {
        oldName: 'global-old',
        newName: 'global-new',
        scope: Scope.AgentGlobal,
        projectRoot,
        globalRoot,
      };

      await renameAgent(request);

      expect(fs.existsSync(oldPath)).toBe(false);
      expect(fs.existsSync(path.join(globalRoot, 'agents', 'global-new'))).toBe(true);
    });

    it('operates on correct scope when same name exists in both', async () => {
      const projectPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'shared-old');
      const globalPath = path.join(globalRoot, 'agents', 'shared-old');

      fs.mkdirSync(projectPath, { recursive: true });
      fs.mkdirSync(globalPath, { recursive: true });

      fs.writeFileSync(path.join(projectPath, 'index.json'), JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] }));
      fs.writeFileSync(path.join(globalPath, 'index.json'), JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] }));

      // Rename only project version
      await renameAgent({
        oldName: 'shared-old',
        newName: 'shared-new',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      });

      // Verify only project renamed
      expect(fs.existsSync(projectPath)).toBe(false);
      expect(fs.existsSync(path.join(projectRoot, '.claude', 'memory', 'agents', 'shared-new'))).toBe(true);
      expect(fs.existsSync(globalPath)).toBe(true); // Global unchanged
    });
  });
});
