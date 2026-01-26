/**
 * T084: Provider Error Messages
 * Graceful error messages with installation instructions
 */
import type { ProviderName } from '../../types/provider-config.js';
import { PROVIDERS } from './providers.js';

export type ProviderErrorType = 'not_found' | 'timeout' | 'error';

/**
 * Get installation instructions for a provider
 */
export function getInstallInstructions(provider: ProviderName): string {
  return PROVIDERS[provider]?.installInstructions ?? `Install ${provider} CLI to use this provider.`;
}

/**
 * Format a provider error message with helpful context
 */
export function formatProviderError(
  provider: ProviderName,
  errorType: ProviderErrorType,
  timeoutSecs?: number,
  details?: string
): string {
  switch (errorType) {
    case 'not_found':
      return `${provider} CLI not found. ${getInstallInstructions(provider)}`;

    case 'timeout':
      return `${provider} CLI timed out after ${timeoutSecs ?? 30}s. Try again or use a different provider.`;

    case 'error':
    default:
      return `${provider} CLI failed${details ? `: ${details}` : '. Check the CLI is working correctly.'}`;
  }
}
