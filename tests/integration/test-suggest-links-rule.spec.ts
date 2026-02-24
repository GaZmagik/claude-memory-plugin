/**
 * T147: Integration test for suggest-links including rule nodes
 *
 * Verifies that rule nodes appear as link candidates in suggest-links results.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { syncMemories } from '../../skills/memory/src/maintenance/sync.js';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { suggestLinks } from '../../skills/memory/src/suggest/suggest-links.js';
import { MemoryType, Scope } from '../../skills/memory/src/types/enums.js';

describe('T147: Suggest-links includes rule nodes', () => {
  let tempDir: string;
  let memBasePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suggest-links-rule-test-'));
    memBasePath = path.join(tempDir, '.claude', 'memory');
    fs.mkdirSync(memBasePath, { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should include rule nodes in suggest-links when embeddings cache exists', async () => {
    // Create rule with TDD content
    fs.writeFileSync(
      path.join(memBasePath, 'CLAUDE.md'),
      '# Project Rules\n\nAlways follow Test-Driven Development principles.'
    );

    await syncMemories({ basePath: memBasePath });

    // Create a decision about TDD
    const decision = await writeMemory({
      title: 'Use TDD for Features',
      type: MemoryType.Decision,
      content: 'We decided to use TDD for all new features.',
      tags: ['tdd', 'testing'],
      scope: Scope.Project,
      basePath: memBasePath,
    });

    expect(decision.status).toBe('success');

    // Create mock embeddings cache with similar embeddings for both nodes
    const embeddingsCache = {
      memories: {
        [decision.memory!.id]: {
          embedding: [0.9, 0.1, 0.0, 0.1], // Similar to rule
        },
        'rule-project-claude-md-root': {
          embedding: [0.85, 0.15, 0.05, 0.1], // Similar to decision
        },
      },
    };

    fs.writeFileSync(
      path.join(memBasePath, 'embeddings.json'),
      JSON.stringify(embeddingsCache, null, 2)
    );

    // Run suggest-links
    const result = await suggestLinks({
      basePath: memBasePath,
      threshold: 0.5,
      limit: 10,
    });

    expect(result.status).toBe('success');
    expect(result.suggestions).toBeDefined();

    // Rule node should appear in suggestions
    const hasRuleInSuggestions = result.suggestions.some(
      s =>
        s.source === 'rule-project-claude-md-root' ||
        s.target === 'rule-project-claude-md-root'
    );

    expect(hasRuleInSuggestions).toBe(true);
  });

  it('should include rules files in suggest-links suggestions', async () => {
    // Create rules file
    const rulesDir = path.join(memBasePath, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(
      path.join(rulesDir, 'security.md'),
      '# Security Rules\n\nValidate all user input.'
    );

    await syncMemories({ basePath: memBasePath });

    // Create a gotcha about security
    const gotcha = await writeMemory({
      title: 'SQL Injection Risk',
      type: MemoryType.Gotcha,
      content: 'Never concatenate user input into SQL queries.',
      tags: ['security'],
      scope: Scope.Project,
      basePath: memBasePath,
    });

    // Create embeddings cache
    const embeddingsCache = {
      memories: {
        [gotcha.memory!.id]: {
          embedding: [0.8, 0.2, 0.0, 0.1],
        },
        'rule-project-security': {
          embedding: [0.85, 0.1, 0.05, 0.1],
        },
      },
    };

    fs.writeFileSync(
      path.join(memBasePath, 'embeddings.json'),
      JSON.stringify(embeddingsCache, null, 2)
    );

    // Suggest links
    const result = await suggestLinks({
      basePath: memBasePath,
      threshold: 0.5,
    });

    expect(result.status).toBe('success');

    // Security rule should appear in suggestions
    const hasSecurityRule = result.suggestions.some(
      s => s.source === 'rule-project-security' || s.target === 'rule-project-security'
    );

    expect(hasSecurityRule).toBe(true);
  });

  it('should not suggest self-links for rule nodes', async () => {
    // Create rule
    fs.writeFileSync(path.join(memBasePath, 'CLAUDE.md'), '# Rules');
    await syncMemories({ basePath: memBasePath });

    // Create embeddings cache with only the rule
    const embeddingsCache = {
      memories: {
        'rule-project-claude-md-root': {
          embedding: [0.9, 0.1, 0.0],
        },
      },
    };

    fs.writeFileSync(
      path.join(memBasePath, 'embeddings.json'),
      JSON.stringify(embeddingsCache, null, 2)
    );

    // Try to suggest links
    const result = await suggestLinks({
      basePath: memBasePath,
      threshold: 0.5,
    });

    expect(result.status).toBe('success');

    // Should have no suggestions (only one node, can't link to itself)
    expect(result.suggestions.length).toBe(0);
  });

  it('should include reminder nodes in suggest-links suggestions', async () => {
    // Create agent reminder
    const agentDir = path.join(memBasePath, '.claude', 'agent-memory', 'test-agent');
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(
      path.join(agentDir, 'MEMORY.md'),
      '# Test Agent Memory\n\nCommon patterns and practices.'
    );

    await syncMemories({ basePath: memBasePath });

    // Create a learning
    const learning = await writeMemory({
      title: 'Pattern Works Well',
      type: MemoryType.Learning,
      content: 'This pattern simplifies the code.',
      tags: ['patterns'],
      scope: Scope.Project,
      basePath: memBasePath,
    });

    // Create embeddings cache
    const embeddingsCache = {
      memories: {
        [learning.memory!.id]: {
          embedding: [0.75, 0.2, 0.05],
        },
        'reminder-project-test-agent-memory': {
          embedding: [0.8, 0.15, 0.05],
        },
      },
    };

    fs.writeFileSync(
      path.join(memBasePath, 'embeddings.json'),
      JSON.stringify(embeddingsCache, null, 2)
    );

    // Suggest links
    const result = await suggestLinks({
      basePath: memBasePath,
      threshold: 0.5,
    });

    expect(result.status).toBe('success');

    // Reminder should appear in suggestions
    const hasReminder = result.suggestions.some(
      s =>
        s.source === 'reminder-project-test-agent-memory' ||
        s.target === 'reminder-project-test-agent-memory'
    );

    expect(hasReminder).toBe(true);
  });
});
