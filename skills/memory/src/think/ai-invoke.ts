/**
 * Think AI Invocation Module
 *
 * Invoke Claude CLI to generate thoughts for thinking documents.
 * Handles prompt construction, style/agent application, and session tracking.
 */

import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { unsafeAsSessionId } from '../types/branded.js';
import type { AICallOptions, AICallResult, ThoughtEntry } from '../types/think.js';
import { ThoughtType } from '../types/enums.js';
import { findAgent, findStyle, readAgentBody, readStyleContent, extractBody } from './discovery.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('think-ai-invoke');

/** Default model for AI invocation */
const DEFAULT_MODEL = 'haiku';

/** Maximum output length to capture (bytes) */
const MAX_OUTPUT_LENGTH = 10 * 1024 * 1024; // 10MB

/**
 * Build the user prompt for AI invocation
 */
export function buildUserPrompt(params: {
  topic: string;
  thoughtType: ThoughtType;
  existingThoughts: ThoughtEntry[];
  guidance?: string;
}): string {
  const { topic, thoughtType, existingThoughts, guidance } = params;

  const parts: string[] = [];

  // Topic context
  parts.push(`## Topic\n${topic}`);

  // Existing thoughts (passed in user prompt, not system)
  if (existingThoughts.length > 0) {
    parts.push('\n## Existing Thoughts');
    for (const thought of existingThoughts) {
      const typeLabel = formatThoughtTypeLabel(thought.type);
      const attribution = thought.by ? ` (${thought.by})` : '';
      parts.push(`\n### ${typeLabel}${attribution}\n${thought.content}`);
    }
  }

  // Task based on thought type
  parts.push(`\n## Your Task`);
  switch (thoughtType) {
    case ThoughtType.Thought:
      parts.push('Add a thoughtful analysis or consideration to this deliberation.');
      break;
    case ThoughtType.CounterArgument:
      parts.push('Provide a counter-argument or alternative perspective to challenge the existing thoughts.');
      break;
    case ThoughtType.Branch:
      parts.push('Suggest an alternative approach or branching path that explores a different direction.');
      break;
    case ThoughtType.Conclusion:
      parts.push('Synthesise the discussion and provide a reasoned conclusion or recommendation.');
      break;
  }

  // User guidance (optional additional context)
  if (guidance) {
    parts.push(`\n## Additional Guidance\n${guidance}`);
  }

  // Output format instruction
  parts.push('\n## Output Format');
  parts.push('Respond with ONLY your thought content. Do not include headers, prefixes, or meta-commentary.');

  return parts.join('\n');
}

/**
 * Format thought type for display
 */
function formatThoughtTypeLabel(type: ThoughtType): string {
  switch (type) {
    case ThoughtType.CounterArgument:
      return 'Counter-argument';
    case ThoughtType.Branch:
      return 'Alternative';
    case ThoughtType.Conclusion:
      return 'Conclusion';
    default:
      return 'Thought';
  }
}

/**
 * Build Claude CLI command arguments
 */
export function buildCliArgs(params: {
  prompt: string;
  sessionId: string;
  options: AICallOptions;
  styleContent?: string;
  agentBody?: string;
}): string[] {
  const { prompt, sessionId, options, styleContent, agentBody } = params;
  const args: string[] = [];

  // Non-interactive mode (no session persistence for sandbox compatibility)
  args.push('--print');
  args.push('--no-session-persistence');

  // Session handling - either resume existing or start new
  if (options.resume) {
    args.push('--resume', options.resume);
  } else {
    args.push('--session-id', sessionId);
  }

  // Model selection
  const model = options.model ?? DEFAULT_MODEL;
  args.push('--model', model);

  // Style replaces default system prompt
  if (styleContent) {
    args.push('--system-prompt', styleContent);
  }

  // Agent body appends to system prompt
  if (agentBody) {
    args.push('--append-system-prompt', agentBody);
  }

  // Tools (if specified)
  if (options.tools && options.tools.length > 0) {
    args.push('--tools', options.tools.join(','));
  }

  // The prompt itself (must be last)
  args.push(prompt);

  return args;
}

/**
 * Execute Claude CLI and capture output
 * Uses execFileSync for safety (no shell injection risk)
 */
function executeClaudeCli(args: string[], sessionId: string): { output: string; sessionId: string } {
  log.debug('Executing Claude CLI', { sessionId, argCount: args.length });

  try {
    const result = execFileSync('claude', args, {
      encoding: 'utf-8',
      maxBuffer: MAX_OUTPUT_LENGTH,
      timeout: 120000, // 2 minute timeout
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return {
      output: result.trim(),
      sessionId,
    };
  } catch (error) {
    const execError = error as { status?: number; stderr?: Buffer | string; stdout?: Buffer | string };
    const stderr = typeof execError.stderr === 'string'
      ? execError.stderr
      : execError.stderr?.toString() ?? '';
    log.error('Claude CLI execution failed', {
      status: execError.status,
      stderr: stderr.slice(0, 500),
    });
    throw new Error(`Claude CLI failed: ${stderr || 'Unknown error'}`);
  }
}

/**
 * Invoke Claude to generate a thought
 */
export async function invokeAI(params: {
  topic: string;
  thoughtType: ThoughtType;
  existingThoughts: ThoughtEntry[];
  options: AICallOptions;
  basePath?: string;
}): Promise<AICallResult> {
  const { topic, thoughtType, existingThoughts, options, basePath } = params;

  try {
    // Resolve style content
    let styleContent: string | undefined;
    if (options.outputStyle) {
      const style = findStyle(options.outputStyle, { basePath });
      if (!style) {
        return {
          success: false,
          error: `Output style not found: ${options.outputStyle}`,
        };
      }
      const rawContent = readStyleContent(style.path);
      if (!rawContent) {
        return {
          success: false,
          error: `Failed to read output style: ${options.outputStyle}`,
        };
      }
      // Extract just the body for system prompt
      styleContent = extractBody(rawContent);
    }

    // Resolve agent body
    let agentBody: string | undefined;
    if (options.agent) {
      const agent = findAgent(options.agent, { basePath });
      if (!agent) {
        return {
          success: false,
          error: `Agent not found: ${options.agent}`,
        };
      }
      agentBody = readAgentBody(agent.path) ?? undefined;
      if (!agentBody) {
        return {
          success: false,
          error: `Failed to read agent: ${options.agent}`,
        };
      }
    }

    // Build user prompt
    const userPrompt = buildUserPrompt({
      topic,
      thoughtType,
      existingThoughts,
      guidance: options.guidance,
    });

    // Generate session ID for new conversations
    const sessionId = options.resume ?? randomUUID();

    // Build CLI args
    const cliArgs = buildCliArgs({
      prompt: userPrompt,
      sessionId,
      options,
      styleContent,
      agentBody,
    });

    // Execute
    const result = executeClaudeCli(cliArgs, sessionId);

    log.info('AI invocation successful', { sessionId: result.sessionId, outputLength: result.output.length });

    return {
      success: true,
      content: result.output,
      sessionId: unsafeAsSessionId(result.sessionId),
    };
  } catch (error) {
    log.error('AI invocation failed', { error: String(error) });
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Check if Claude CLI is available
 */
export function isClaudeCliAvailable(): boolean {
  try {
    execFileSync('which', ['claude'], { encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Claude CLI version
 */
export function getClaudeCliVersion(): string | null {
  try {
    const output = execFileSync('claude', ['--version'], { encoding: 'utf-8', stdio: 'pipe' });
    return output.trim();
  } catch {
    return null;
  }
}
