/**
 * T073: Provider Configuration Types
 * Defines interfaces for cross-provider CLI invocation
 */

/**
 * Supported AI providers
 */
export type ProviderName = 'claude' | 'codex' | 'gemini';

/**
 * Command structure for CLI invocation
 */
export interface ProviderCommand {
  /** Binary name (e.g., 'claude', 'codex', 'gemini') */
  binary: string;
  /** Command arguments */
  args: string[];
  /** Environment variables to set */
  env?: Record<string, string>;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Options for building a provider command
 */
export interface ProviderCommandOptions {
  /** The prompt/thought to send */
  prompt: string;
  /** Model to use (provider-specific) */
  model?: string;
  /** Output style content (Claude only) */
  styleContent?: string;
  /** Agent content to append (Claude only) */
  agentContent?: string;
  /** Use OSS models (Codex only) */
  oss?: boolean;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  /** Provider name */
  name: ProviderName;
  /** CLI binary name */
  binary: string;
  /** Default model for this provider */
  defaultModel: string;
  /** Whether --agent flag is supported */
  supportsAgent: boolean;
  /** Whether --style flag is supported */
  supportsStyle: boolean;
  /** Whether --oss flag is supported */
  supportsOss: boolean;
  /** Installation instructions */
  installInstructions: string;
}

/**
 * Result from provider invocation
 */
export interface ProviderResult {
  /** Parsed output content */
  content: string;
  /** Provider that was used */
  provider: ProviderName;
  /** Model that was used */
  model?: string;
  /** Execution time in ms */
  durationMs: number;
  /** Whether the call timed out */
  timedOut?: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Attribution information for a thought
 */
export interface ThoughtAttribution {
  /** Provider name */
  provider: ProviderName;
  /** Model used */
  model?: string;
  /** Output style applied */
  style?: string;
  /** Agent used */
  agent?: string;
}
