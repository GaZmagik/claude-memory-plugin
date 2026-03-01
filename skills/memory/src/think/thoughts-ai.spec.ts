/**
 * Tests for Think Thought Operations - AI Invocation Path
 *
 * Separated to allow mock.module isolation (run in separate process)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ThoughtType } from '../types/enums.js';

// Top-level mock functions declared before vi.mock() so they are available
// in the factory. Bun's vitest compat does not support vi.hoisted().
type AIResult = { success: boolean; content?: string; sessionId?: string; model?: string; error?: string };

const mockInvokeAI = vi.fn(async (): Promise<AIResult> => ({
  success: true,
  content: 'AI generated thought content',
  sessionId: 'test-session-123',
}));

const mockInvokeProviderThought = vi.fn(async (): Promise<AIResult> => ({
  success: true,
  content: 'Provider generated thought content',
  // Note: non-Claude providers don't support session resumption
}));

// Mock ai-invoke module BEFORE importing thoughts.js
vi.mock('./ai-invoke.js', () => ({
  invokeAI: mockInvokeAI,
  invokeProviderThought: mockInvokeProviderThought,
}));

// Static imports - vi.mock is hoisted so these see the mocked module
import { addThought } from './thoughts.js';
import { createThinkDocument } from './document.js';

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

    // Override mock implementations to return failure
    mockInvokeAI.mockImplementation(async () => ({
      success: false,
      error: 'AI service unavailable',
    }));
    mockInvokeProviderThought.mockImplementation(async () => ({
      success: false,
      error: 'Provider service unavailable',
    }));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    // Restore default implementations for subsequent describe blocks
    mockInvokeAI.mockImplementation(async () => ({
      success: true,
      content: 'AI generated thought content',
      sessionId: 'test-session-123',
    }));
    mockInvokeProviderThought.mockImplementation(async () => ({
      success: true,
      content: 'Provider generated thought content',
    }));
  });

  it('returns error when AI invocation fails', async () => {
    await createThinkDocument({ topic: 'AI Fail Test', basePath });

    const result = await addThought({
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
    vi.restoreAllMocks();
  });

  it('routes to codex provider with parsed model attribution', async () => {
    // Mock for codex - returns actual model parsed from CLI output
    mockInvokeAI.mockImplementation(async () => ({ success: true, content: 'Claude content' }));
    mockInvokeProviderThought.mockImplementation(async () => ({
      success: true,
      content: 'Codex generated thought',
      model: 'gpt-5.2-codex', // Parsed from actual CLI output
    }));

    await createThinkDocument({ topic: 'Codex Test', basePath });

    const result = await addThought({
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
    mockInvokeAI.mockImplementation(async () => ({ success: true, content: 'Claude content' }));
    mockInvokeProviderThought.mockImplementation(async () => ({
      success: true,
      content: 'Gemini generated thought',
      model: 'gemini-3-flash-preview', // Parsed from actual CLI output
    }));

    await createThinkDocument({ topic: 'Gemini Test', basePath });

    const result = await addThought({
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
    mockInvokeAI.mockImplementation(async () => ({
      success: true,
      content: 'Claude explicit content',
      sessionId: 'claude-session',
    }));
    mockInvokeProviderThought.mockImplementation(async () => ({
      success: true,
      content: 'Provider content',
    }));

    await createThinkDocument({ topic: 'Claude Explicit Test', basePath });

    const result = await addThought({
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
    mockInvokeAI.mockImplementation(async () => ({
      success: true,
      content: 'Default claude content',
      sessionId: 'default-session',
    }));
    mockInvokeProviderThought.mockImplementation(async () => ({
      success: true,
      content: 'Should not be called',
    }));

    await createThinkDocument({ topic: 'Default Provider Test', basePath });

    const result = await addThought({
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
    mockInvokeAI.mockImplementation(async () => ({ success: true, content: 'Claude content' }));
    mockInvokeProviderThought.mockImplementation(async () => ({
      success: true,
      content: 'Codex with custom model',
    }));

    await createThinkDocument({ topic: 'Model Override Test', basePath });

    const result = await addThought({
      thought: 'Use custom model',
      type: ThoughtType.Thought,
      call: { provider: 'codex', model: 'gpt-4-turbo' },
      basePath,
    });

    expect(result.status).toBe('success');
    // Should use specified model, not default
    expect(result.thought?.by).toContain('model:gpt-4-turbo');
  });

  it('handles provider timeout gracefully', async () => {
    // Mock for timeout scenario
    mockInvokeAI.mockImplementation(async () => ({ success: true, content: 'Claude content' }));
    mockInvokeProviderThought.mockImplementation(async () => ({
      success: false,
      error: 'codex CLI timed out after 120s',
    }));

    await createThinkDocument({ topic: 'Timeout Test', basePath });

    const result = await addThought({
      thought: 'This will timeout',
      type: ThoughtType.Thought,
      call: { provider: 'codex' },
      basePath,
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('AI invocation failed');
  });

  it('handles unavailable provider gracefully', async () => {
    // Mock for unavailable provider scenario
    mockInvokeAI.mockImplementation(async () => ({ success: true, content: 'Claude content' }));
    mockInvokeProviderThought.mockImplementation(async () => ({
      success: false,
      error: 'gemini CLI not found. Please install the CLI.',
    }));

    await createThinkDocument({ topic: 'Unavailable Test', basePath });

    const result = await addThought({
      thought: 'Provider not installed',
      type: ThoughtType.Thought,
      call: { provider: 'gemini' },
      basePath,
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('AI invocation failed');
  });
});
