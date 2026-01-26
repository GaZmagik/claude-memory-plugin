/**
 * Co-located tests for detect.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectProvider, isProviderAvailable, getAvailableProviders } from './detect.js';

// Mock child_process for isProviderAvailable tests
const mockExecFileSync = vi.fn();
vi.mock('node:child_process', () => ({
  execFileSync: mockExecFileSync,
}));

describe('detectProvider', () => {
  it('returns provider for valid lowercase input', () => {
    expect(detectProvider('claude')).toBe('claude');
    expect(detectProvider('codex')).toBe('codex');
    expect(detectProvider('gemini')).toBe('gemini');
  });

  it('normalises case to lowercase', () => {
    expect(detectProvider('CLAUDE')).toBe('claude');
    expect(detectProvider('Codex')).toBe('codex');
    expect(detectProvider('GEMINI')).toBe('gemini');
  });

  it('trims whitespace', () => {
    expect(detectProvider('  claude  ')).toBe('claude');
    expect(detectProvider('\tgemini\n')).toBe('gemini');
  });

  it('returns null for empty input', () => {
    expect(detectProvider('')).toBeNull();
    expect(detectProvider(undefined)).toBeNull();
  });

  it('returns null for invalid provider names', () => {
    expect(detectProvider('gpt')).toBeNull();
    expect(detectProvider('openai')).toBeNull();
    expect(detectProvider('anthropic')).toBeNull();
    expect(detectProvider('ollama')).toBeNull();
  });

  it('returns null for partial matches', () => {
    expect(detectProvider('clau')).toBeNull();
    expect(detectProvider('claudee')).toBeNull();
    expect(detectProvider('code')).toBeNull();
  });
});

describe('isProviderAvailable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when provider binary exists', () => {
    mockExecFileSync.mockReturnValue('/usr/bin/claude');
    expect(isProviderAvailable('claude')).toBe(true);
    expect(mockExecFileSync).toHaveBeenCalledWith('which', ['claude'], { stdio: 'pipe' });
  });

  it('returns false when provider binary not found', () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('Command failed');
    });
    expect(isProviderAvailable('codex')).toBe(false);
  });

  it('calls which with correct provider name', () => {
    mockExecFileSync.mockReturnValue('/usr/bin/gemini');
    isProviderAvailable('gemini');
    expect(mockExecFileSync).toHaveBeenCalledWith('which', ['gemini'], { stdio: 'pipe' });
  });
});

describe('getAvailableProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns only available providers', () => {
    mockExecFileSync.mockImplementation((_cmd, args) => {
      const provider = (args as string[])[0];
      if (provider === 'claude') return '/usr/bin/claude';
      throw new Error('Not found');
    });
    expect(getAvailableProviders()).toEqual(['claude']);
  });

  it('returns all providers when all are available', () => {
    mockExecFileSync.mockReturnValue('/usr/bin/provider');
    expect(getAvailableProviders()).toEqual(['claude', 'codex', 'gemini']);
  });

  it('returns empty array when no providers available', () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('Not found');
    });
    expect(getAvailableProviders()).toEqual([]);
  });
});
