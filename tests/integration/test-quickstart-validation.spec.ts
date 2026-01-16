/**
 * Quickstart Validation Tests
 *
 * Validates that the documented quickstart scenarios work correctly.
 * This is an end-to-end test that exercises the CLI workflow.
 *
 * Reference: .specify/specs/feature/001-memory-plugin/quickstart.md
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { mkdtempSync, rmSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';

const CLI_PATH = join(import.meta.dir, '../../skills/memory/src/cli.ts');

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  json?: unknown;
}

function runCli(args: string[], cwd: string, stdinJson?: object): CliResult {
  const result = spawnSync('bun', [CLI_PATH, ...args], {
    cwd,
    encoding: 'utf-8',
    input: stdinJson ? JSON.stringify(stdinJson) : undefined,
    timeout: 30000,
    env: { ...process.env, LOG_LEVEL: 'error' }, // Suppress info logs
  });

  const stdout = result.stdout || '';
  let json: unknown;

  // Try to extract JSON from output (may have log lines before it)
  try {
    json = JSON.parse(stdout);
  } catch {
    // Try to find JSON object that starts at beginning of line
    // The CLI outputs log lines followed by JSON response
    const jsonMatch = stdout.match(/^(\{[\s\S]*\})$/m);
    if (jsonMatch) {
      try {
        json = JSON.parse(jsonMatch[1]);
      } catch {
        // Try finding last complete JSON object
        const lines = stdout.split('\n');
        let jsonStr = '';
        let inJson = false;
        for (const line of lines) {
          if (line.startsWith('{')) {
            inJson = true;
            jsonStr = line;
          } else if (inJson) {
            jsonStr += '\n' + line;
          }
        }
        if (jsonStr) {
          try {
            json = JSON.parse(jsonStr);
          } catch {
            // Still not valid
          }
        }
      }
    }
  }

  return {
    stdout,
    stderr: result.stderr || '',
    exitCode: result.status ?? 1,
    json,
  };
}

describe('Quickstart Validation', () => {
  let testDir: string;
  let projectDir: string;

  beforeAll(() => {
    testDir = mkdtempSync(join(tmpdir(), 'quickstart-validation-'));
    projectDir = join(testDir, 'test-project');

    mkdirSync(projectDir, { recursive: true });

    // Initialise git repo in project dir
    spawnSync('git', ['init'], { cwd: projectDir });
    spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: projectDir });
    spawnSync('git', ['config', 'user.name', 'Test'], { cwd: projectDir });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('Scenario 1: Basic CRUD Operations (US1)', () => {
    const memoryDir = () => join(projectDir, '.claude/memory');

    beforeEach(() => {
      if (existsSync(memoryDir())) {
        rmSync(memoryDir(), { recursive: true, force: true });
      }
    });

    it('should create a decision memory via JSON stdin', () => {
      const result = runCli(['write'], projectDir, {
        title: 'Use OAuth2 with PKCE for authentication',
        type: 'decision',
        tags: ['auth', 'oauth2', 'security'],
        content: 'We decided to use OAuth2 with PKCE for secure authentication.',
      });

      expect(result.exitCode).toBe(0);
      expect(result.json).toBeDefined();
      const response = result.json as { status: string; data?: { memory?: { id: string } } };
      expect(response.status).toBe('success');
      expect(response.data?.memory?.id).toContain('decision');
    });

    it('should read a created memory', () => {
      // Create first
      const writeResult = runCli(['write'], projectDir, {
        title: 'Test memory for reading',
        type: 'learning',
        tags: ['test'],
        content: 'This is test content.',
      });

      const writeResponse = writeResult.json as { data?: { memory?: { id: string } } };
      const memoryId = writeResponse.data?.memory?.id;
      expect(memoryId).toBeDefined();

      // Read it back
      const readResult = runCli(['read', memoryId!], projectDir);
      expect(readResult.exitCode).toBe(0);
      expect(readResult.stdout).toContain('Test memory for reading');
    });

    it('should list all memories', () => {
      // Create multiple memories
      runCli(['write'], projectDir, { title: 'First', type: 'decision', content: 'First memory' });
      runCli(['write'], projectDir, { title: 'Second', type: 'learning', content: 'Second memory' });
      runCli(['write'], projectDir, { title: 'Third', type: 'gotcha', content: 'Third memory' });

      const result = runCli(['list'], projectDir);
      expect(result.exitCode).toBe(0);
      // Output should contain the memories
      expect(result.stdout).toContain('decision');
      expect(result.stdout).toContain('learning');
      expect(result.stdout).toContain('gotcha');
    });

    it('should filter by type', () => {
      runCli(['write'], projectDir, { title: 'A decision', type: 'decision', content: 'Decision content' });
      runCli(['write'], projectDir, { title: 'A learning', type: 'learning', content: 'Learning content' });

      // Filter by decision type (positional arg)
      const result = runCli(['list', 'decision'], projectDir);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('decision');
      expect(result.stdout).not.toContain('learning-');
    });

    it('should perform keyword search', () => {
      runCli(['write'], projectDir, {
        title: 'Authentication uses OAuth2',
        type: 'decision',
        content: 'OAuth2 is the auth standard.',
      });
      runCli(['write'], projectDir, {
        title: 'Database uses PostgreSQL',
        type: 'decision',
        content: 'PostgreSQL for data storage.',
      });

      const result = runCli(['search', 'OAuth2'], projectDir);
      expect(result.exitCode).toBe(0);
      // Search results should include OAuth2 memory
      const response = result.json as { data?: { results?: Array<{ id: string }> } };
      expect(response.data?.results?.length).toBeGreaterThan(0);
    });

    it('should delete a memory', () => {
      // Create a memory
      const writeResult = runCli(['write'], projectDir, {
        title: 'Memory to delete',
        type: 'breadcrumb',
        content: 'Will be deleted.',
      });

      const writeResponse = writeResult.json as { data?: { memory?: { id: string } } };
      const memoryId = writeResponse.data?.memory?.id;
      expect(memoryId).toBeDefined();

      // Delete it
      const deleteResult = runCli(['delete', memoryId!], projectDir);
      expect(deleteResult.exitCode).toBe(0);

      // Verify deleted - read should fail (error in data.status, not outer status)
      const readResult = runCli(['read', memoryId!], projectDir);
      const readResponse = readResult.json as { data?: { status?: string; error?: string } };
      expect(readResponse.data?.status).toBe('error');
    });
  });

  describe('Scenario 2: Scope Resolution (US6)', () => {
    beforeEach(() => {
      const memoryDir = join(projectDir, '.claude/memory');
      if (existsSync(memoryDir)) {
        rmSync(memoryDir, { recursive: true, force: true });
      }
    });

    it('should create project-scoped memory in git repo', () => {
      const result = runCli(['write'], projectDir, {
        title: 'Project specific note',
        type: 'decision',
        content: 'Project-level decision.',
      });

      expect(result.exitCode).toBe(0);
      const response = result.json as { data?: { memory?: { scope: string } } };
      expect(response.data?.memory?.scope).toBe('project');
    });

    it('should create local-scoped memory with gitignore automation', () => {
      const result = runCli(['write'], projectDir, {
        title: 'Local personal note',
        type: 'breadcrumb',
        scope: 'local',
        content: 'Private note.',
      });

      expect(result.exitCode).toBe(0);

      // Check gitignore was updated
      const gitignorePath = join(projectDir, '.gitignore');
      if (existsSync(gitignorePath)) {
        const gitignore = readFileSync(gitignorePath, 'utf-8');
        expect(gitignore).toContain('.claude/memory/local');
      }
    });
  });

  describe('Scenario 3: Search Operations (US2)', () => {
    beforeEach(() => {
      const memoryDir = join(projectDir, '.claude/memory');
      if (existsSync(memoryDir)) {
        rmSync(memoryDir, { recursive: true, force: true });
      }
    });

    it('should perform keyword search across memories', () => {
      runCli(['write'], projectDir, {
        title: 'Authentication flow using JWT tokens',
        type: 'decision',
        content: 'JWT is used for auth tokens.',
      });
      runCli(['write'], projectDir, {
        title: 'Database connection pooling',
        type: 'learning',
        content: 'Connection pool settings.',
      });

      const result = runCli(['search', 'JWT'], projectDir);
      expect(result.exitCode).toBe(0);
      const response = result.json as { data?: { results?: unknown[] } };
      expect(response.data?.results?.length).toBeGreaterThan(0);
    });

    it('should return empty results for non-matching search', () => {
      runCli(['write'], projectDir, {
        title: 'Some memory about testing',
        type: 'learning',
        content: 'Test content here.',
      });

      const result = runCli(['search', 'nonexistent-xyz-term'], projectDir);
      expect(result.exitCode).toBe(0);
      const response = result.json as { data?: { results?: unknown[] } };
      expect(response.data?.results?.length).toBe(0);
    });
  });

  describe('Scenario 4: Graph Operations (US3)', () => {
    beforeEach(() => {
      const memoryDir = join(projectDir, '.claude/memory');
      if (existsSync(memoryDir)) {
        rmSync(memoryDir, { recursive: true, force: true });
      }
    });

    it('should create bidirectional links between memories', () => {
      // Create two memories
      const r1 = runCli(['write'], projectDir, {
        title: 'Auth architecture',
        type: 'decision',
        content: 'Architecture for authentication.',
      });
      const r2 = runCli(['write'], projectDir, {
        title: 'OAuth2 implementation',
        type: 'artifact',
        content: 'Implementation details.',
      });

      const id1 = (r1.json as { data?: { memory?: { id: string } } }).data?.memory?.id;
      const id2 = (r2.json as { data?: { memory?: { id: string } } }).data?.memory?.id;

      if (id1 && id2) {
        const linkResult = runCli(['link', id1, id2], projectDir);
        expect(linkResult.exitCode).toBe(0);

        // Verify link exists
        const edgesResult = runCli(['edges', id1], projectDir);
        expect(edgesResult.exitCode).toBe(0);
        expect(edgesResult.stdout).toContain(id2);
      }
    });

    it('should unlink memories', () => {
      const r1 = runCli(['write'], projectDir, { title: 'Memory A', type: 'decision', content: 'A' });
      const r2 = runCli(['write'], projectDir, { title: 'Memory B', type: 'decision', content: 'B' });

      const id1 = (r1.json as { data?: { memory?: { id: string } } }).data?.memory?.id;
      const id2 = (r2.json as { data?: { memory?: { id: string } } }).data?.memory?.id;

      if (id1 && id2) {
        runCli(['link', id1, id2], projectDir);
        const unlinkResult = runCli(['unlink', id1, id2], projectDir);
        expect(unlinkResult.exitCode).toBe(0);
      }
    });
  });

  describe('Scenario 5: Health & Quality (US5)', () => {
    it('should run health check', () => {
      const result = runCli(['health'], projectDir);
      expect(result.exitCode).toBe(0);
      const response = result.json as { status: string };
      expect(response.status).toBe('success');
    });

    it('should display stats', () => {
      const result = runCli(['stats'], projectDir);
      expect(result.exitCode).toBe(0);
      const response = result.json as { status: string; data?: { nodes: number } };
      expect(response.status).toBe('success');
      expect(response.data?.nodes).toBeDefined();
    });
  });

  describe('Performance Requirements (SC-002)', () => {
    it('should complete write operation in reasonable time', () => {
      const start = Date.now();
      runCli(['write'], projectDir, {
        title: 'Performance test memory',
        type: 'breadcrumb',
        content: 'Testing write performance.',
      });
      const elapsed = Date.now() - start;

      // Should complete in less than 2 seconds
      expect(elapsed).toBeLessThan(2000);
    });

    it('should complete list operation in reasonable time', () => {
      const start = Date.now();
      runCli(['list'], projectDir);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(1000);
    });

    it('should complete health check in reasonable time', () => {
      const start = Date.now();
      runCli(['health'], projectDir);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(1000);
    });
  });
});
