/**
 * Tests for services/ollama.ts
 *
 * D-T1–D-T5: availability check, timeout, happy path, host config, import isolation.
 */

import { describe, it, expect, vi, afterEach, beforeEach, afterAll } from 'vitest';
import { mock } from 'bun:test';
import { readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Ollama } from 'ollama';
import { generate, isAvailable, configureClient, resetChatModelCache, resetContextWindowCache } from './ollama.js';

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
  (Ollama as any).mockImplementation(() => ({
    generate: overrides.generate ?? vi.fn().mockRejectedValue(new Error('Not set')),
    list:     overrides.list     ?? vi.fn().mockRejectedValue(new Error('Not set')),
  } as any));
}

afterAll(() => {
  mock.restore(); // Unmock vi.mock module replacements to prevent cross-test pollution
});

// ============================================================================
// D-T1 — T056: isAvailable() returns false without throwing when Ollama not running
// ============================================================================

describe('isAvailable', () => {
  beforeEach(() => {
    (Ollama as any).mockClear();
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
    (Ollama as any).mockClear();
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

  it('passes context window from config to Ollama API', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'context-window-test-'));
    mkdirSync(join(tmpDir, '.claude'), { recursive: true });
    writeFileSync(
      join(tmpDir, '.claude', 'memory.local.md'),
      '---\nchat_model: gemma3:4b\ncontext_window: 16384\n---\n'
    );
    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
    resetChatModelCache();
    resetContextWindowCache();

    const mockGen = vi.fn().mockResolvedValue({ response: 'ok' });
    mockOllamaClient({ generate: mockGen });
    configureClient('http://localhost:11434');

    await generate('test prompt');

    expect(mockGen).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { num_ctx: 16384 }
      })
    );

    vi.restoreAllMocks();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('uses default context window when not configured', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'default-context-test-'));
    mkdirSync(join(tmpDir, '.claude'), { recursive: true });
    writeFileSync(
      join(tmpDir, '.claude', 'memory.local.md'),
      '---\nchat_model: gemma3:4b\n---\n'
    );
    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
    resetChatModelCache();
    resetContextWindowCache();

    const mockGen = vi.fn().mockResolvedValue({ response: 'ok' });
    mockOllamaClient({ generate: mockGen });
    configureClient('http://localhost:11434');

    await generate('test prompt');

    expect(mockGen).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { num_ctx: 16384 } // DEFAULT_CONTEXT_WINDOW
      })
    );

    vi.restoreAllMocks();
    rmSync(tmpDir, { recursive: true, force: true });
  });
});

// ============================================================================
// D-T4 — T059: configureClient() with custom host changes the endpoint
// ============================================================================

describe('configureClient', () => {
  afterEach(() => {
    (Ollama as any).mockClear();
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
// Review fix: readChatModel() must cache result — not re-read disk every call
// ============================================================================

describe('readChatModel caching', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'ollama-cache-test-'));
    mkdirSync(join(tmpDir, '.claude'), { recursive: true });
    writeFileSync(
      join(tmpDir, '.claude', 'memory.local.md'),
      '---\nchat_model: cached-model-a\n---\n'
    );
    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
    resetChatModelCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns the same model on second call even when the settings file changes', async () => {
    const mockGen = vi.fn().mockResolvedValue({ response: 'ok' });
    mockOllamaClient({ generate: mockGen });
    configureClient('http://localhost:11434');

    await generate('first call');
    // Overwrite file with different model — cache should prevent re-read
    writeFileSync(
      join(tmpDir, '.claude', 'memory.local.md'),
      '---\nchat_model: different-model-b\n---\n'
    );
    await generate('second call');

    expect(mockGen).toHaveBeenNthCalledWith(1, expect.objectContaining({ model: 'cached-model-a' }));
    expect(mockGen).toHaveBeenNthCalledWith(2, expect.objectContaining({ model: 'cached-model-a' }));
  });

  it('after resetChatModelCache(), re-reads the settings file on next call', async () => {
    const mockGen = vi.fn().mockResolvedValue({ response: 'ok' });
    mockOllamaClient({ generate: mockGen });
    configureClient('http://localhost:11434');

    await generate('first call');
    writeFileSync(
      join(tmpDir, '.claude', 'memory.local.md'),
      '---\nchat_model: refreshed-model-c\n---\n'
    );
    resetChatModelCache();
    await generate('second call after reset');

    expect(mockGen).toHaveBeenNthCalledWith(1, expect.objectContaining({ model: 'cached-model-a' }));
    expect(mockGen).toHaveBeenNthCalledWith(2, expect.objectContaining({ model: 'refreshed-model-c' }));
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
