/**
 * T074: Provider Command Builders
 */
import type { ProviderCommand, ProviderCommandOptions } from '../../types/provider-config.js';

/** Timeout bounds for provider CLIs */
const MIN_TIMEOUT_MS = 5000;   // 5 seconds minimum
const MAX_TIMEOUT_MS = 300000; // 5 minutes maximum
const DEFAULT_TIMEOUT_MS = 30000;  // 30 seconds for Claude
const SLOW_PROVIDER_TIMEOUT_MS = 120000;  // 2 minutes for Codex/Gemini (MCP startup)

/**
 * Sanitise model name to prevent argument injection
 * Allows alphanumeric, dots, hyphens, underscores, colons (for OSS models like gpt-oss:120b)
 */
export function sanitiseModelName(model: string): string {
  return model.replace(/[^a-zA-Z0-9._:-]/g, '').slice(0, 100);
}

/**
 * Validate and clamp timeout to safe bounds
 */
export function validateTimeout(timeout: number): number {
  return Math.min(Math.max(timeout, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
}

export function buildClaudeCommand(options: ProviderCommandOptions): ProviderCommand {
  const args: string[] = ['--print', options.prompt];
  if (options.model) args.push('--model', sanitiseModelName(options.model));
  if (options.styleContent) args.push('--system-prompt', options.styleContent);
  if (options.agentContent) args.push('--append-system-prompt', options.agentContent);
  return { binary: 'claude', args, timeout: validateTimeout(DEFAULT_TIMEOUT_MS) };
}

export function buildCodexCommand(options: ProviderCommandOptions): ProviderCommand {
  const args: string[] = ['exec', options.prompt];
  if (options.model) args.push('--model', sanitiseModelName(options.model));
  if (options.oss) args.push('--oss');
  return { binary: 'codex', args, timeout: validateTimeout(SLOW_PROVIDER_TIMEOUT_MS) };
}

export function buildGeminiCommand(options: ProviderCommandOptions): ProviderCommand {
  // gemini [query] [options] - prompt first, flags after
  const args: string[] = [options.prompt, '--debug'];  // --debug to capture model info
  if (options.model) args.push('--model', sanitiseModelName(options.model));
  return { binary: 'gemini', args, timeout: validateTimeout(SLOW_PROVIDER_TIMEOUT_MS) };
}
