/**
 * T079: Thought Attribution Formatter
 * Formats and parses attribution strings for thoughts from different providers
 */
import type { ThoughtAttribution, ProviderName } from '../types/provider-config.js';

/**
 * Capitalise provider name for display
 */
function capitaliseProvider(provider: ProviderName): string {
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

/**
 * Format attribution for display
 *
 * Examples:
 * - { provider: 'claude', model: 'haiku' } → "Claude (haiku)"
 * - { provider: 'claude', model: 'haiku', style: 'Devils-Advocate' } → "Claude (haiku) [Devils-Advocate]"
 * - { provider: 'claude', model: 'haiku', agent: 'security-reviewer' } → "Claude (haiku) @security-reviewer"
 */
export function formatAttribution(attr: ThoughtAttribution): string {
  const parts: string[] = [capitaliseProvider(attr.provider)];

  if (attr.model) {
    parts[0] += ` (${attr.model})`;
  }

  if (attr.style) {
    parts.push(`[${attr.style}]`);
  }

  if (attr.agent) {
    parts.push(`@${attr.agent}`);
  }

  return parts.join(' ');
}

/**
 * Parse attribution string back to components
 *
 * Handles formats like:
 * - "Claude (haiku)"
 * - "Claude (haiku) [Devils-Advocate]"
 * - "Claude (haiku) @security-reviewer"
 * - "Claude (haiku) [Style] @agent"
 */
export function parseAttribution(str: string): Partial<ThoughtAttribution> {
  const result: Partial<ThoughtAttribution> = {};

  // Match provider (and optional model)
  const providerMatch = str.match(/^(Claude|Codex|Gemini)(?:\s*\(([^)]+)\))?/i);
  if (!providerMatch) {
    return result;
  }

  result.provider = providerMatch[1].toLowerCase() as ProviderName;
  if (providerMatch[2]) {
    result.model = providerMatch[2];
  }

  // Match style [Style]
  const styleMatch = str.match(/\[([^\]]+)\]/);
  if (styleMatch) {
    result.style = styleMatch[1];
  }

  // Match agent @agent
  const agentMatch = str.match(/@(\S+)/);
  if (agentMatch) {
    result.agent = agentMatch[1];
  }

  return result;
}
