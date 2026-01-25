/**
 * T077: Provider Detection
 */
import { execFileSync } from 'node:child_process';
import type { ProviderName } from '../../types/provider-config.js';

const VALID_PROVIDERS: ProviderName[] = ['claude', 'codex', 'gemini'];

export function detectProvider(callValue: string | undefined): ProviderName | null {
  if (!callValue) return null;
  const n = callValue.toLowerCase().trim() as ProviderName;
  return VALID_PROVIDERS.includes(n) ? n : null;
}

export function isProviderAvailable(provider: ProviderName): boolean {
  try { execFileSync('which', [provider], { stdio: 'pipe' }); return true; } catch { return false; }
}

export function getAvailableProviders(): ProviderName[] {
  return VALID_PROVIDERS.filter(isProviderAvailable);
}
