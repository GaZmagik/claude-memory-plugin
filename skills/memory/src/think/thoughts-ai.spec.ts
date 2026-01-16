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
mock.module('./ai-invoke.js', () => ({
  invokeAI: mock(async () => ({
    success: true,
    content: 'AI generated thought content',
    sessionId: 'test-session-123',
  })),
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
