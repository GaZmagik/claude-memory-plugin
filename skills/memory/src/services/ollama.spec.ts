/**
 * Tests for services/ollama.ts
 *
 * D-T1–D-T5: availability check, timeout, happy path, host config, import isolation.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { Ollama } from 'ollama';
import { generate, isAvailable, configureClient } from './ollama.js';

vi.mock('ollama', () => ({
  Ollama: vi.fn(),
}));

// ============================================================================
// Helpers
// ============================================================================

function mockOllamaClient(overrides: {
  generate?: ReturnType<typeof vi.fn>;
  list?: ReturnType<typeof vi.fn>;
}) {
  vi.mocked(Ollama).mockImplementation(() => ({
    generate: overrides.generate ?? vi.fn().mockRejectedValue(new Error('Not set')),
    list:     overrides.list     ?? vi.fn().mockRejectedValue(new Error('Not set')),
  } as any));
}

// ============================================================================
// D-T1 — T056: isAvailable() returns false without throwing when Ollama not running
// ============================================================================

describe('isAvailable', () => {
  beforeEach(() => {
    vi.mocked(Ollama).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // T056
  it('returns false without throwing when Ollama is not running', async () => {
    mockOllamaClient({
      list: vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:11434')),
    });
    configureClient('http://localhost:11434');

    const result = await isAvailable();
    expect(result).toBe(false);
  });

  it('returns true when Ollama responds', async () => {
    mockOllamaClient({
      list: vi.fn().mockResolvedValue({ models: [{ name: 'gemma3:4b' }] }),
    });
    configureClient('http://localhost:11434');

    const result = await isAvailable();
    expect(result).toBe(true);
  });
});

// ============================================================================
// D-T2 — T057: generate() returns '' and does not throw on timeout
// D-T3 — T058: generate() returns response string when Ollama responds
// ============================================================================

describe('generate', () => {
  beforeEach(() => {
    vi.mocked(Ollama).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // T057
  it('returns empty string and does not throw when generate times out', async () => {
    vi.useFakeTimers();

    mockOllamaClient({
      generate: vi.fn().mockReturnValue(new Promise<never>(() => {})),
    });
    configureClient('http://localhost:11434');

    const promise = generate('test prompt');
    vi.advanceTimersByTime(16_000);

    await expect(promise).resolves.toBe('');
  });

  // T058
  it('returns the LLM response string when Ollama responds within timeout', async () => {
    mockOllamaClient({
      generate: vi.fn().mockResolvedValue({ response: 'superseded-by' }),
    });
    configureClient('http://localhost:11434');

    const result = await generate('what is the relation?');
    expect(result).toBe('superseded-by');
  });

  it('returns empty string and does not throw when generate rejects', async () => {
    mockOllamaClient({
      generate: vi.fn().mockRejectedValue(new Error('model not found')),
    });
    configureClient('http://localhost:11434');

    const result = await generate('test');
    expect(result).toBe('');
  });

  it('uses provided model override', async () => {
    const mockGen = vi.fn().mockResolvedValue({ response: 'ok' });
    mockOllamaClient({ generate: mockGen });
    configureClient('http://localhost:11434');

    await generate('prompt', 'llama3.2');
    expect(mockGen).toHaveBeenCalledWith(expect.objectContaining({ model: 'llama3.2' }));
  });
});

// ============================================================================
// D-T4 — T059: configureClient() with custom host changes the endpoint
// ============================================================================

describe('configureClient', () => {
  afterEach(() => {
    vi.mocked(Ollama).mockClear();
    // Reset to default host
    configureClient('http://localhost:11434');
  });

  // T059
  it('with a custom host, creates a new client using that host', () => {
    configureClient('http://custom-host:11434');
    expect(Ollama).toHaveBeenCalledWith({ host: 'http://custom-host:11434' });
  });
});

// ============================================================================
// D-T5 — T060: module does not import from hooks/
// ============================================================================

describe('import isolation', () => {
  // T060
  it('does not import anything from the hooks/ package', () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(dir, 'ollama.ts'), 'utf-8');

    expect(source).not.toMatch(/from ['"].*\/hooks\//);
    expect(source).not.toMatch(/require\(['"].*\/hooks\//);
  });
});
