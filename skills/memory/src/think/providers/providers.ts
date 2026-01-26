/**
 * T078: Provider Configurations
 * Central registry of all supported AI providers
 */
import type { ProviderConfig, ProviderName } from '../../types/provider-config.js';

/**
 * Claude provider configuration
 */
const CLAUDE_CONFIG: ProviderConfig = {
  name: 'claude',
  binary: 'claude',
  defaultModel: 'claude-sonnet-4-5-20250929',
  supportsAgent: true,
  supportsStyle: true,
  supportsOss: false,
  installInstructions: 'Install Claude Code: npm install -g @anthropic-ai/claude-code',
};

/**
 * Codex provider configuration
 */
const CODEX_CONFIG: ProviderConfig = {
  name: 'codex',
  binary: 'codex',
  defaultModel: 'gpt-5.2-codex',  // Matches actual Codex CLI banner output
  supportsAgent: false,
  supportsStyle: false,
  supportsOss: true,
  installInstructions: 'Install Codex CLI: npm install -g @openai/codex',
};

/**
 * Gemini provider configuration
 */
const GEMINI_CONFIG: ProviderConfig = {
  name: 'gemini',
  binary: 'gemini',
  defaultModel: 'gemini-2.5-pro',
  supportsAgent: false,
  supportsStyle: false,
  supportsOss: false,
  installInstructions: 'Install Gemini CLI: npm install -g @google/gemini-cli',
};

/**
 * All provider configurations indexed by name
 */
export const PROVIDERS: Record<ProviderName, ProviderConfig> = {
  claude: CLAUDE_CONFIG,
  codex: CODEX_CONFIG,
  gemini: GEMINI_CONFIG,
};

/**
 * Get provider configuration by name
 */
export function getProvider(name: ProviderName): ProviderConfig | undefined {
  return PROVIDERS[name];
}

/**
 * Get the default provider (Claude)
 */
export function getDefaultProvider(): ProviderConfig {
  return PROVIDERS.claude;
}
