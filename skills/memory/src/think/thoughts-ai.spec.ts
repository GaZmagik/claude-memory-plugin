/**
 * Tests for Think Thought Operations - AI Invocation Path
 *
 * Separated to allow mock.module isolation (run in separate process)
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ThoughtType } from '../types/enums.js';

// Mock ai-invoke module BEFORE importing thoughts.js
const mockInvokeAI = mock(async () => ({
  success: true,
  content: 'AI generated thought content',
  sessionId: 'test-session-123',
}));

const mockInvokeProviderThought = mock(async () => ({
  success: true,
  content: 'Provider generated thought content',
  // Note: non-Claude providers don't support session resumption
}));

mock.module('./ai-invoke.js', () => ({
  invokeAI: mockInvokeAI,
  invokeProviderThought: mockInvokeProviderThought,
}));

// Now import the module under test
const { addThought } = await import('./thoughts.js');
const { createThinkDocument } = await import('./document.js');

describe('think/thoughts AI invocation', () => {
  let tempDir: string;
  let basePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'think-ai-test-'));
    basePath = path.join(tempDir, 'project');
    fs.mkdirSync(path.join(basePath, '.claude', 'memory'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('invokes AI when call option provided', async () => {
    await createThinkDocument({ topic: 'AI Test', basePath });

    const result = await addThought({
      thought: 'Generate a thought about this',
      type: ThoughtType.Thought,
      call: { model: 'haiku' },
      basePath,
    });

    expect(result.status).toBe('success');
    expect(result.thought?.content).toBe('AI generated thought content');
    expect(result.thought?.by).toContain('model:haiku');
  });

  it('includes style and agent in attribution', async () => {
    await createThinkDocument({ topic: 'Styled AI', basePath });

    const result = await addThought({
      thought: 'Generate with style',
      type: ThoughtType.Thought,
      call: {
        model: 'sonnet',
        outputStyle: 'concise',
        agent: 'reviewer',
      },
      basePath,
    });

    expect(result.status).toBe('success');
    expect(result.thought?.by).toContain('model:sonnet');
    expect(result.thought?.by).toContain('style:concise');
    expect(result.thought?.by).toContain('agent:reviewer');
    // outputStyle and agent are added to entry but may not be in return type
    const thought = result.thought as Record<string, unknown>;
    expect(thought?.outputStyle).toBe('concise');
    expect(thought?.agent).toBe('reviewer');
  });

  it('includes session ID in attribution', async () => {
    await createThinkDocument({ topic: 'Session Test', basePath });

    const result = await addThought({
      thought: 'Test session',
      type: ThoughtType.Thought,
      call: { model: 'haiku' },
      basePath,
    });

    expect(result.status).toBe('success');
    expect(result.thought?.by).toContain('[test-session-123]');
  });
});

describe('think/thoughts AI invocation failure', () => {
  let tempDir: string;
  let basePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'think-ai-fail-'));
    basePath = path.join(tempDir, 'project');
    fs.mkdirSync(path.join(basePath, '.claude', 'memory'), { recursive: true });

    // Override mock to return failure
    mock.module('./ai-invoke.js', () => ({
      invokeAI: mock(async () => ({
        success: false,
        error: 'AI service unavailable',
      })),
      invokeProviderThought: mock(async () => ({
        success: false,
        error: 'Provider service unavailable',
      })),
    }));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns error when AI invocation fails', async () => {
    // Need fresh import after mock change
    const { addThought: addThoughtFail } = await import('./thoughts.js');
    const { createThinkDocument: createFail } = await import('./document.js');

    await createFail({ topic: 'AI Fail Test', basePath });

    const result = await addThoughtFail({
      thought: 'This will fail',
      type: ThoughtType.Thought,
      call: { model: 'haiku' },
      basePath,
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('AI invocation failed');
  });
});

describe('think/thoughts provider routing', () => {
  let tempDir: string;
  let basePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'think-provider-'));
    basePath = path.join(tempDir, 'project');
    fs.mkdirSync(path.join(basePath, '.claude', 'memory'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('routes to codex provider with parsed model attribution', async () => {
    // Mock for codex - returns actual model parsed from CLI output
    mock.module('./ai-invoke.js', () => ({
      invokeAI: mock(async () => ({ success: true, content: 'Claude content' })),
      invokeProviderThought: mock(async () => ({
        success: true,
        content: 'Codex generated thought',
        model: 'gpt-5.2-codex',  // Parsed from actual CLI output
      })),
    }));

    const { addThought: addProviderThought } = await import('./thoughts.js');
    const { createThinkDocument: createProviderDoc } = await import('./document.js');

    await createProviderDoc({ topic: 'Codex Test', basePath });

    const result = await addProviderThought({
      thought: 'Ask codex about this',
      type: ThoughtType.Thought,
      call: { provider: 'codex' },
      basePath,
    });

    expect(result.status).toBe('success');
    expect(result.thought?.content).toBe('Codex generated thought');
    // Should use actual model parsed from CLI output
    expect(result.thought?.by).toContain('model:gpt-5.2-codex');
  });

  it('routes to gemini provider with parsed model attribution', async () => {
    // Mock for gemini - returns actual model parsed from CLI output
    mock.module('./ai-invoke.js', () => ({
      invokeAI: mock(async () => ({ success: true, content: 'Claude content' })),
      invokeProviderThought: mock(async () => ({
        success: true,
        content: 'Gemini generated thought',
        model: 'gemini-3-flash-preview',  // Parsed from actual CLI output
      })),
    }));

    const { addThought: addGeminiThought } = await import('./thoughts.js');
    const { createThinkDocument: createGeminiDoc } = await import('./document.js');

    await createGeminiDoc({ topic: 'Gemini Test', basePath });

    const result = await addGeminiThought({
      thought: 'Ask gemini about this',
      type: ThoughtType.Thought,
      call: { provider: 'gemini' },
      basePath,
    });

    expect(result.status).toBe('success');
    expect(result.thought?.content).toBe('Gemini generated thought');
    // Should use actual model parsed from CLI output
    expect(result.thought?.by).toContain('model:gemini-3-flash-preview');
  });

  it('routes to claude when provider is claude', async () => {
    // Mock for explicit claude
    mock.module('./ai-invoke.js', () => ({
      invokeAI: mock(async () => ({
        success: true,
        content: 'Claude explicit content',
        sessionId: 'claude-session',
      })),
      invokeProviderThought: mock(async () => ({
        success: true,
        content: 'Provider content',
      })),
    }));

    const { addThought: addClaudeThought } = await import('./thoughts.js');
    const { createThinkDocument: createClaudeDoc } = await import('./document.js');

    await createClaudeDoc({ topic: 'Claude Explicit Test', basePath });

    const result = await addClaudeThought({
      thought: 'Ask claude explicitly',
      type: ThoughtType.Thought,
      call: { provider: 'claude' },
      basePath,
    });

    expect(result.status).toBe('success');
    expect(result.thought?.content).toBe('Claude explicit content');
    // Should use haiku as default for claude
    expect(result.thought?.by).toContain('model:haiku');
  });

  it('defaults to claude when no provider specified', async () => {
    // Mock for default (no provider)
    mock.module('./ai-invoke.js', () => ({
      invokeAI: mock(async () => ({
        success: true,
        content: 'Default claude content',
        sessionId: 'default-session',
      })),
      invokeProviderThought: mock(async () => ({
        success: true,
        content: 'Should not be called',
      })),
    }));

    const { addThought: addDefaultThought } = await import('./thoughts.js');
    const { createThinkDocument: createDefaultDoc } = await import('./document.js');

    await createDefaultDoc({ topic: 'Default Provider Test', basePath });

    const result = await addDefaultThought({
      thought: 'No provider specified',
      type: ThoughtType.Thought,
      call: {}, // No provider field
      basePath,
    });

    expect(result.status).toBe('success');
    expect(result.thought?.content).toBe('Default claude content');
    expect(result.thought?.by).toContain('model:haiku');
  });

  it('allows model override for non-claude providers', async () => {
    // Mock for model override
    mock.module('./ai-invoke.js', () => ({
      invokeAI: mock(async () => ({ success: true, content: 'Claude content' })),
      invokeProviderThought: mock(async () => ({
        success: true,
        content: 'Codex with custom model',
      })),
    }));

    const { addThought: addOverrideThought } = await import('./thoughts.js');
    const { createThinkDocument: createOverrideDoc } = await import('./document.js');

    await createOverrideDoc({ topic: 'Model Override Test', basePath });

    const result = await addOverrideThought({
      thought: 'Use custom model',
      type: ThoughtType.Thought,
      call: { provider: 'codex', model: 'gpt-4-turbo' },
      basePath,
    });

    expect(result.status).toBe('success');
    // Should use specified model, not default
    expect(result.thought?.by).toContain('model:gpt-4-turbo');
  });
});
