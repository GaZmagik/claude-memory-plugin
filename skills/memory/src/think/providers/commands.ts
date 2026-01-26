/**
 * T074: Provider Command Builders
 */
import type { ProviderCommand, ProviderCommandOptions } from '../../types/provider-config.js';

export function buildClaudeCommand(options: ProviderCommandOptions): ProviderCommand {
  const args: string[] = ['--print', options.prompt];
  if (options.model) args.push('--model', options.model);
  if (options.styleContent) args.push('--system-prompt', options.styleContent);
  if (options.agentContent) args.push('--append-system-prompt', options.agentContent);
  return { binary: 'claude', args, timeout: 30000 };
}

export function buildCodexCommand(options: ProviderCommandOptions): ProviderCommand {
  const args: string[] = ['exec', options.prompt];
  if (options.model) args.push('--model', options.model);
  if (options.oss) args.push('--oss');
  return { binary: 'codex', args, timeout: 120000 };  // 2 min - slow MCP startup
}

export function buildGeminiCommand(options: ProviderCommandOptions): ProviderCommand {
  const args: string[] = ['--debug', options.prompt];  // --debug to capture model info
  if (options.model) args.push('--model', options.model);
  return { binary: 'gemini', args, timeout: 120000 };  // 2 min - slow MCP startup
}
