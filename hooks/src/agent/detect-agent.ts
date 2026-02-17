/**
 * Agent Identity Detection
 *
 * Multi-source agent identity resolution for hooks.
 * Priority order:
 * 1. --agent flag in args
 * 2. CLAUDE_AGENT_NAME environment variable
 * 3. agent_context field (future)
 */

export interface AgentDetectionResult {
  /** Whether an agent was detected */
  detected: boolean;
  /** Agent name if detected */
  name?: string;
  /** Source of detection */
  source?: 'args' | 'env' | 'context';
}

/**
 * Detect agent identity from multiple sources.
 *
 * Priority order:
 * 1. --agent flag in tool args
 * 2. CLAUDE_AGENT_NAME environment variable
 * 3. agent_context field (future enhancement)
 *
 * @param args - Command arguments string (e.g., from Task tool)
 * @param env - Environment variables object (defaults to process.env)
 * @returns Detection result with name and source
 */
export function detectAgent(
  args?: string,
  env: Record<string, string | undefined> = process.env
): AgentDetectionResult {
  // Priority 1: Check --agent flag in args
  if (args) {
    // Match --agent with alphanumeric, hyphens, and underscores (mixed case)
    const agentMatch = args.match(/--agent[\s=]+"?([a-zA-Z0-9_-]+)"?/);
    if (agentMatch && agentMatch[1]) {
      return {
        detected: true,
        name: agentMatch[1],
        source: 'args',
      };
    }
  }

  // Priority 2: Check CLAUDE_AGENT_NAME environment variable
  const envAgentName = env.CLAUDE_AGENT_NAME;
  if (envAgentName && envAgentName.trim().length > 0) {
    return {
      detected: true,
      name: envAgentName.trim(),
      source: 'env',
    };
  }

  // Priority 3: agent_context field (future)
  // This would require changes to Claude Code to expose agent_context
  // in hook input. For now, not implemented.

  return {
    detected: false,
  };
}

/**
 * Extract subagent type from Task tool args.
 *
 * @param args - Tool arguments string
 * @returns Subagent type if found
 */
export function extractSubagentType(args?: string): string | undefined {
  if (!args) return undefined;

  // Match subagent_type parameter
  const match = args.match(/subagent_type["']?\s*:\s*["']([^"']+)["']/);
  return match?.[1];
}
