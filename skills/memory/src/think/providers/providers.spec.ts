/**
 * Co-located tests for providers.ts (T078)
 */
import { describe, it, expect } from 'vitest';
import { PROVIDERS, getProvider, getDefaultProvider } from './providers.js';

describe('providers', () => {
  it('exports PROVIDERS map with all three providers', () => {
    expect(PROVIDERS.claude).toBeDefined();
    expect(PROVIDERS.codex).toBeDefined();
    expect(PROVIDERS.gemini).toBeDefined();
  });

  it('claude config has correct properties', () => {
    const claude = PROVIDERS.claude;
    expect(claude.name).toBe('claude');
    expect(claude.binary).toBe('claude');
    expect(claude.supportsAgent).toBe(true);
    expect(claude.supportsStyle).toBe(true);
    expect(claude.supportsOss).toBe(false);
  });

  it('codex config has correct properties', () => {
    const codex = PROVIDERS.codex;
    expect(codex.name).toBe('codex');
    expect(codex.binary).toBe('codex');
    expect(codex.supportsAgent).toBe(false);
    expect(codex.supportsStyle).toBe(false);
    expect(codex.supportsOss).toBe(true);
  });

  it('gemini config has correct properties', () => {
    const gemini = PROVIDERS.gemini;
    expect(gemini.name).toBe('gemini');
    expect(gemini.binary).toBe('gemini');
    expect(gemini.supportsAgent).toBe(false);
    expect(gemini.supportsStyle).toBe(false);
    expect(gemini.supportsOss).toBe(false);
  });

  it('getProvider returns correct config', () => {
    expect(getProvider('claude')?.name).toBe('claude');
    expect(getProvider('codex')?.name).toBe('codex');
    expect(getProvider('gemini')?.name).toBe('gemini');
    expect(getProvider('invalid' as any)).toBeUndefined();
  });

  it('getDefaultProvider returns claude', () => {
    expect(getDefaultProvider().name).toBe('claude');
  });
});
