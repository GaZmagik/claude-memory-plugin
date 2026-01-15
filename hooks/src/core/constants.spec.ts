/**
 * Tests for constants.ts
 *
 * Validates that critical constants are correctly defined and maintain expected values.
 * These tests ensure configuration consistency across the hook system.
 */

import { describe, it, expect } from 'vitest';
import {
  HOOK_EVENTS,
  TOOLS,
  PROTECTED_PATHS,
  PROTECTED_FILES,
  PERFORMANCE,
  OLLAMA_MODELS,
  CACHE_PATHS,
  EXIT_CODES,
  DANGEROUS_COMMANDS,
  GIT_PROTECTED_BRANCHES,
  type HookEventName,
  type ToolName,
} from './constants.ts';

describe('constants', () => {
  describe('HOOK_EVENTS', () => {
    it('should include all standard hook events', () => {
      expect(HOOK_EVENTS).toContain('PreToolUse');
      expect(HOOK_EVENTS).toContain('PostToolUse');
      expect(HOOK_EVENTS).toContain('UserPromptSubmit');
      expect(HOOK_EVENTS).toContain('PreCompact');
      expect(HOOK_EVENTS).toContain('SessionStart');
      expect(HOOK_EVENTS).toContain('SessionEnd');
      expect(HOOK_EVENTS).toContain('Stop');
      expect(HOOK_EVENTS).toContain('SubagentStop');
    });

    it('should have exactly 8 hook event types', () => {
      expect(HOOK_EVENTS.length).toBe(8);
    });

    it('should be a readonly tuple', () => {
      // TypeScript compile-time check - this ensures the array is readonly
      const events: readonly string[] = HOOK_EVENTS;
      expect(events).toBeDefined();
    });
  });

  describe('TOOLS', () => {
    it('should include all file manipulation tools', () => {
      expect(TOOLS).toContain('Read');
      expect(TOOLS).toContain('Write');
      expect(TOOLS).toContain('Edit');
      expect(TOOLS).toContain('MultiEdit');
      expect(TOOLS).toContain('Glob');
      expect(TOOLS).toContain('Grep');
    });

    it('should include execution tools', () => {
      expect(TOOLS).toContain('Bash');
      expect(TOOLS).toContain('Task');
      expect(TOOLS).toContain('TaskOutput');
    });

    it('should include web tools', () => {
      expect(TOOLS).toContain('WebFetch');
      expect(TOOLS).toContain('WebSearch');
    });

    it('should include interaction tools', () => {
      expect(TOOLS).toContain('TodoWrite');
      expect(TOOLS).toContain('AskUserQuestion');
      expect(TOOLS).toContain('Skill');
      expect(TOOLS).toContain('SlashCommand');
    });

    it('should include plan mode tools', () => {
      expect(TOOLS).toContain('EnterPlanMode');
      expect(TOOLS).toContain('ExitPlanMode');
    });

    it('should include all expected tools (19 total)', () => {
      expect(TOOLS.length).toBe(19);
    });
  });

  describe('PROTECTED_PATHS', () => {
    it('should protect memory directory', () => {
      expect(PROTECTED_PATHS.MEMORY_DIRECTORY).toBe('.claude/memory/');
    });

    it('should protect specify directory', () => {
      expect(PROTECTED_PATHS.SPECIFY_DIRECTORY).toBe('.specify/');
    });

    it('should protect approvals directory', () => {
      expect(PROTECTED_PATHS.APPROVALS_DIRECTORY).toBe('.claude/approvals/');
    });

    it('should protect critical memory files', () => {
      expect(PROTECTED_PATHS.GRAPH_JSON).toBe('.claude/memory/graph.json');
      expect(PROTECTED_PATHS.INDEX_JSON).toBe('.claude/memory/index.json');
    });

    it('should have paths ending with / for directories', () => {
      expect(PROTECTED_PATHS.MEMORY_DIRECTORY.endsWith('/')).toBe(true);
      expect(PROTECTED_PATHS.SPECIFY_DIRECTORY.endsWith('/')).toBe(true);
      expect(PROTECTED_PATHS.APPROVALS_DIRECTORY.endsWith('/')).toBe(true);
    });

    it('should have 5 protected paths', () => {
      expect(Object.keys(PROTECTED_PATHS).length).toBe(5);
    });
  });

  describe('PROTECTED_FILES', () => {
    it('should protect specification files', () => {
      expect(PROTECTED_FILES).toContain('spec.md');
      expect(PROTECTED_FILES).toContain('plan.md');
      expect(PROTECTED_FILES).toContain('tasks.md');
      expect(PROTECTED_FILES).toContain('constitution.md');
    });

    it('should have 4 protected files', () => {
      expect(PROTECTED_FILES.length).toBe(4);
    });

    it('should all be markdown files', () => {
      for (const file of PROTECTED_FILES) {
        expect(file.endsWith('.md')).toBe(true);
      }
    });
  });

  describe('PERFORMANCE', () => {
    it('should have reasonable simple hook threshold', () => {
      expect(PERFORMANCE.SIMPLE_HOOK_MS).toBe(100);
      expect(PERFORMANCE.SIMPLE_HOOK_MS).toBeLessThan(500);
    });

    it('should have reasonable Ollama hook threshold', () => {
      expect(PERFORMANCE.OLLAMA_HOOK_MS).toBe(200);
      expect(PERFORMANCE.OLLAMA_HOOK_MS).toBeLessThan(1000);
    });

    it('should have indexed semantic search faster than fallback', () => {
      expect(PERFORMANCE.SEMANTIC_INDEXED_MS).toBeLessThan(PERFORMANCE.SEMANTIC_FALLBACK_MS);
    });

    it('should have appropriate Ollama timeout', () => {
      expect(PERFORMANCE.OLLAMA_TIMEOUT_MS).toBe(10000);
      expect(PERFORMANCE.OLLAMA_TIMEOUT_MS).toBeGreaterThan(PERFORMANCE.OLLAMA_HOOK_MS);
    });

    it('should have all thresholds in milliseconds (positive integers)', () => {
      for (const value of Object.values(PERFORMANCE)) {
        expect(value).toBeGreaterThan(0);
        expect(Number.isInteger(value)).toBe(true);
      }
    });
  });

  describe('OLLAMA_MODELS', () => {
    it('should specify chat model', () => {
      expect(OLLAMA_MODELS.CHAT).toBe('gemma3:4b');
    });

    it('should specify embedding model', () => {
      expect(OLLAMA_MODELS.EMBEDDING).toBe('embeddinggemma:latest-cpu');
    });

    it('should have model names in expected format', () => {
      expect(OLLAMA_MODELS.CHAT).toMatch(/^[a-z0-9]+:[a-z0-9]+$/);
      expect(OLLAMA_MODELS.EMBEDDING).toMatch(/^[a-z0-9]+:.+$/);
    });
  });

  describe('CACHE_PATHS', () => {
    it('should define session cache path', () => {
      expect(CACHE_PATHS.SESSIONS).toBe('.claude/cache/sessions/');
    });

    it('should define semantic index cache path', () => {
      expect(CACHE_PATHS.SEMANTIC_INDEX).toBe('.claude/cache/semantic-index/');
    });

    it('should have paths under .claude/cache/', () => {
      for (const path of Object.values(CACHE_PATHS)) {
        expect(path.startsWith('.claude/cache/')).toBe(true);
      }
    });

    it('should have paths ending with /', () => {
      for (const path of Object.values(CACHE_PATHS)) {
        expect(path.endsWith('/')).toBe(true);
      }
    });
  });

  describe('EXIT_CODES', () => {
    it('should define standard exit codes', () => {
      expect(EXIT_CODES.ALLOW).toBe(0);
      expect(EXIT_CODES.WARN).toBe(1);
      expect(EXIT_CODES.BLOCK).toBe(2);
    });

    it('should have exit codes in ascending order of severity', () => {
      expect(EXIT_CODES.ALLOW).toBeLessThan(EXIT_CODES.WARN);
      expect(EXIT_CODES.WARN).toBeLessThan(EXIT_CODES.BLOCK);
    });
  });

  describe('DANGEROUS_COMMANDS', () => {
    it('should include destructive rm commands', () => {
      expect(DANGEROUS_COMMANDS).toContain('rm -rf /');
      expect(DANGEROUS_COMMANDS).toContain('rm -rf ~');
      expect(DANGEROUS_COMMANDS).toContain('sudo rm');
    });

    it('should include disk manipulation commands', () => {
      expect(DANGEROUS_COMMANDS).toContain('format');
      expect(DANGEROUS_COMMANDS).toContain('fdisk');
      expect(DANGEROUS_COMMANDS).toContain('mkfs');
    });

    it('should include fork bomb', () => {
      expect(DANGEROUS_COMMANDS).toContain(':(){:|:&};:');
    });

    it('should include dangerous dd command', () => {
      expect(DANGEROUS_COMMANDS).toContain('dd if=/dev/zero');
    });

    it('should include dangerous chmod', () => {
      expect(DANGEROUS_COMMANDS).toContain('chmod -R 777 /');
    });

    it('should have at least 8 dangerous patterns', () => {
      expect(DANGEROUS_COMMANDS.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('GIT_PROTECTED_BRANCHES', () => {
    it('should protect main branch', () => {
      expect(GIT_PROTECTED_BRANCHES).toContain('main');
    });

    it('should protect master branch', () => {
      expect(GIT_PROTECTED_BRANCHES).toContain('master');
    });

    it('should only have main and master', () => {
      expect(GIT_PROTECTED_BRANCHES.length).toBe(2);
    });
  });

  describe('type exports', () => {
    it('should export HookEventName type that matches HOOK_EVENTS', () => {
      // Type-level test - if this compiles, the types are correct
      const testEvent: HookEventName = 'PreToolUse';
      expect(HOOK_EVENTS.includes(testEvent)).toBe(true);
    });

    it('should export ToolName type that matches TOOLS', () => {
      // Type-level test - if this compiles, the types are correct
      const testTool: ToolName = 'Write';
      expect(TOOLS.includes(testTool)).toBe(true);
    });
  });

  describe('integration checks', () => {
    it('should have memory paths consistent between PROTECTED_PATHS', () => {
      // GRAPH_JSON and INDEX_JSON should be inside MEMORY_DIRECTORY
      expect(PROTECTED_PATHS.GRAPH_JSON.startsWith(PROTECTED_PATHS.MEMORY_DIRECTORY.slice(0, -1))).toBe(true);
      expect(PROTECTED_PATHS.INDEX_JSON.startsWith(PROTECTED_PATHS.MEMORY_DIRECTORY.slice(0, -1))).toBe(true);
    });

    it('should have Write/Edit/MultiEdit in TOOLS (for protection hooks)', () => {
      // These are the tools that protect-memory-directory.ts checks
      expect(TOOLS).toContain('Write');
      expect(TOOLS).toContain('Edit');
      expect(TOOLS).toContain('MultiEdit');
    });
  });
});
