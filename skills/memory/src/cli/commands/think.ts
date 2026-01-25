/**
 * CLI Commands: Think Operations
 *
 * Handlers for the think subcommand hierarchy.
 */

import type { ParsedArgs } from '../parser.js';
import { parseArgs, getFlagString, getFlagBool } from '../parser.js';
import type { CliResponse } from '../response.js';
import { error, wrapOperation } from '../response.js';
import { ThoughtType, MemoryType } from '../../types/enums.js';
import {
  createThinkDocument,
  listThinkDocuments,
  deleteThinkDocument,
} from '../../think/document.js';
import { addThought } from '../../think/thoughts.js';
import { useThinkDocument } from '../../think/thoughts.js';
import { concludeThinkDocument } from '../../think/conclude.js';
import { getResolvedScopePath, parseScope } from '../helpers.js';
import { HintTracker, shouldShowHint } from '../hint-tracker.js';
import { isComplexThought } from '../complex-thought.js';
import { outputHintToStderr, getRotatingHint, shouldShowHintInMode } from '../hint-output.js';
import { promptForAiAssistance, shouldPrompt } from '../interactive-prompt.js';
import { AutoSelector, type AutoSelectionResult } from '../../think/auto-selector.js';
import { CircuitBreaker } from '../../think/circuit-breaker.js';
import { discoverStyles, discoverAgents } from '../../think/discovery.js';
import { sanitiseStyleName, sanitiseAgentName } from '../../think/sanitise.js';
import { extractAvoidList, type ThoughtMetadata } from '../../think/avoid-list.js';
import { showThinkDocument } from '../../think/document.js';
import prompts from 'prompts';
import { detectProvider } from '../../think/providers/detect.js';
import { PROVIDERS } from '../../think/providers/providers.js';
import type { ProviderName } from '../../types/provider-config.js';

/**
 * Parse memory type string for promotion
 */
function parsePromoteType(typeStr: string | undefined): MemoryType | undefined {
  switch (typeStr?.toLowerCase()) {
    case 'decision':
      return MemoryType.Decision;
    case 'learning':
      return MemoryType.Learning;
    case 'artifact':
      return MemoryType.Artifact;
    case 'gotcha':
      return MemoryType.Gotcha;
    default:
      return undefined;
  }
}

/**
 * think - Main dispatcher for think subcommands
 *
 * Usage: memory think <subcommand> [options]
 */
export async function cmdThink(args: ParsedArgs): Promise<CliResponse> {
  const subcommand = args.positional[0];

  if (!subcommand) {
    return error('Missing subcommand. Use: create, add, counter, branch, list, show, use, conclude, delete');
  }

  // Re-parse remaining args for subcommand
  const subArgs = parseArgs(args.positional.slice(1));
  // Merge flags from parent
  subArgs.flags = { ...args.flags, ...subArgs.flags };

  switch (subcommand) {
    case 'create':
      return thinkCreate(subArgs);
    case 'add':
      return thinkAdd(subArgs, ThoughtType.Thought);
    case 'counter':
      return thinkAdd(subArgs, ThoughtType.CounterArgument);
    case 'branch':
      return thinkAdd(subArgs, ThoughtType.Branch);
    case 'list':
      return thinkList(subArgs);
    case 'show':
      return thinkShow(subArgs);
    case 'use':
      return thinkUse(subArgs);
    case 'conclude':
      return thinkConclude(subArgs);
    case 'delete':
      return thinkDelete(subArgs);
    default:
      return error(`Unknown think subcommand: ${subcommand}`);
  }
}

// Circuit breaker instance (module-level singleton for session persistence)
let circuitBreakerInstance: CircuitBreaker | null = null;
function getCircuitBreaker(): CircuitBreaker {
  if (!circuitBreakerInstance) {
    circuitBreakerInstance = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 30000 });
  }
  return circuitBreakerInstance;
}

/**
 * Simple stderr spinner for long-running operations
 */
class Spinner {
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private frameIndex = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private message: string;

  constructor(message: string) {
    this.message = message;
  }

  start(): void {
    if (!process.stderr.isTTY) return;
    this.interval = setInterval(() => {
      const frame = this.frames[this.frameIndex];
      process.stderr.write(`\r${frame} ${this.message}`);
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 80);
  }

  stop(clearLine = true): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (clearLine && process.stderr.isTTY) {
      process.stderr.write('\r' + ' '.repeat(this.message.length + 3) + '\r');
    }
  }
}

/**
 * Perform auto-selection of style/agent using tiered strategy
 */
async function performAutoSelection(
  thought: string,
  basePath: string,
  options: { nonInteractive: boolean; isTTY: boolean }
): Promise<{ style?: string; agent?: string } | null> {
  // Discover available styles and agents
  const styles = discoverStyles().map((s) => s.name);
  const agents = discoverAgents().map((a) => a.name);

  if (styles.length === 0 && agents.length === 0) {
    return null; // Nothing to select from
  }

  // Get avoid list from current document (if available)
  let avoidStyles: string[] = [];
  try {
    const docResult = await showThinkDocument({ basePath });
    if (docResult.document?.thoughts && Array.isArray(docResult.document.thoughts)) {
      const thoughtMetadata: ThoughtMetadata[] = docResult.document.thoughts.map((t) => ({
        style: t.outputStyle,
        agent: t.agent,
      }));
      avoidStyles = extractAvoidList(thoughtMetadata);
    }
  } catch {
    // No current document or error - proceed without avoid list
  }

  // Create auto-selector with tiered strategy
  const selector = new AutoSelector({
    ollamaTimeout: 5000,
    defaultStyle: styles[0] ?? 'Concise',
    circuitBreaker: getCircuitBreaker(),
    // Note: generateFn would be wired to Ollama here in production
    // For now, we rely on heuristics and default fallback
  });
  selector.setAvailable(styles, agents);

  // Show spinner during selection (Ollama can be slow on cold start)
  const spinner = new Spinner('Analysing thought...');
  if (options.isTTY && !options.nonInteractive) {
    spinner.start();
  }

  // Perform selection
  let result;
  try {
    result = await selector.select(thought, avoidStyles);
  } finally {
    spinner.stop();
  }

  // In non-interactive mode, just apply the selection
  if (options.nonInteractive || !options.isTTY) {
    return { style: result.style, agent: result.agent };
  }

  // Interactive mode: show confirmation prompt
  const confirmed = await promptAutoConfirmation(result);
  if (confirmed) {
    return { style: result.style, agent: result.agent };
  }

  return null; // User declined
}

/**
 * Prompt user to confirm auto-selection
 */
async function promptAutoConfirmation(result: AutoSelectionResult): Promise<boolean> {
  const description = result.style
    ? `Style: ${result.style}`
    : result.agent
      ? `Agent: ${result.agent}`
      : 'Default selection';

  const response = await prompts({
    type: 'confirm',
    name: 'proceed',
    message: `Auto-selected: ${description} (${result.source}: ${result.reason}). Apply?`,
    initial: true,
  });

  return response.proceed === true;
}

/**
 * think create - Create a new thinking document
 */
async function thinkCreate(args: ParsedArgs): Promise<CliResponse> {
  const topic = args.positional[0];

  if (!topic) {
    return error('Missing required argument: topic');
  }

  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);

  return wrapOperation(
    async () => {
      const result = await createThinkDocument({ topic, scope, basePath });
      return result;
    },
    `Created thinking document: ${topic}`
  );
}

/**
 * think add/counter/branch - Add a thought to a document
 */
async function thinkAdd(args: ParsedArgs, type: ThoughtType): Promise<CliResponse> {
  const thought = args.positional[0];

  if (!thought) {
    return error('Missing required argument: thought');
  }

  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);
  const documentId = getFlagString(args.flags, 'to');
  const by = getFlagString(args.flags, 'by');

  // Check for --call flag (AI invocation) - T081
  const callValue = getFlagString(args.flags, 'call');
  const provider: ProviderName = detectProvider(callValue) ?? 'claude';
  const callAgent = callValue ? provider : undefined; // backwards compat: truthy means invoke AI
  // Sanitise style/agent names to prevent path traversal attacks
  let style = sanitiseStyleName(getFlagString(args.flags, 'style') ?? '') || undefined;
  let agent = sanitiseAgentName(getFlagString(args.flags, 'agent') ?? '') || undefined;
  const resume = getFlagString(args.flags, 'resume');
  const model = getFlagString(args.flags, 'model');
  const autoFlag = getFlagBool(args.flags, 'auto') ?? false;
  const ossFlag = getFlagBool(args.flags, 'oss') ?? false; // T082

  // T083: Provider-specific warnings
  if (callAgent && provider !== 'claude') {
    const providerConfig = PROVIDERS[provider];
    if (style && !providerConfig.supportsStyle) {
      process.stderr.write(`⚠️  Warning: --style is not supported by ${provider}, ignored\n`);
    }
    if (agent && !providerConfig.supportsAgent) {
      process.stderr.write(`⚠️  Warning: --agent is not supported by ${provider}, ignored\n`);
    }
    if (ossFlag && !providerConfig.supportsOss) {
      process.stderr.write(`⚠️  Warning: --oss is only supported by codex, ignored\n`);
    }
  }

  // Check for complex thought and prompt for AI assistance if interactive
  const nonInteractive = getFlagBool(args.flags, 'non-interactive') ?? false;
  const isTTY = process.stdin.isTTY ?? false;

  // Handle --auto flag: AI-powered style/agent selection
  if (autoFlag && !style && !agent) {
    const autoResult = await performAutoSelection(thought, basePath, { nonInteractive, isTTY });
    if (autoResult) {
      style = autoResult.style;
      agent = autoResult.agent;
    }
  }

  if (!callAgent && isComplexThought(thought)) {
    // Complex thought detected - offer AI assistance if interactive
    if (shouldPrompt({ nonInteractive, isTTY })) {
      const promptResult = await promptForAiAssistance({
        thought,
        command: `think:${type}`,
        nonInteractive,
        isTTY,
        suggestStyle: thought.includes('?'),
      });

      if (promptResult.proceed && promptResult.suggestion) {
        // User accepted - provide suggestion in response
        // (Actual invocation would require re-running with the flag)
      }
    }
  }

  const response = await wrapOperation(
    async () => {
      const result = await addThought({
        thought,
        type,
        documentId,
        by,
        basePath,
        call: callAgent
          ? {
              model,  // Use --model flag (defaults to 'haiku' in invoker)
              outputStyle: style,
              agent,
              resume,
            }
          : undefined,
      });
      return result;
    },
    `Added ${type} to thinking document`
  );

  // Progressive hint disclosure - show hints for first 3 invocations per command
  if (response.status === 'success' && !callAgent) {
    const commandKey = `think:${type}`;
    const cacheDir = `${basePath}/../cache/hints`;
    const sessionId = process.env.CLAUDE_SESSION_ID ?? 'default';

    try {
      const tracker = await HintTracker.create(cacheDir, sessionId);

      if (shouldShowHint(tracker, commandKey) && shouldShowHintInMode({ nonInteractive, isTTY })) {
        const hint = getRotatingHint(tracker.getCount(commandKey));
        outputHintToStderr(hint);
      }

      await tracker.increment(commandKey);
    } catch {
      // Hint tracking failure is non-fatal - continue silently
    }
  }

  return response;
}

/**
 * think list - List all thinking documents
 */
async function thinkList(args: ParsedArgs): Promise<CliResponse> {
  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);

  return wrapOperation(
    async () => {
      const result = await listThinkDocuments({ basePath, scope });
      return result;
    },
    'Listed thinking documents'
  );
}

/**
 * think show - Show a thinking document
 */
async function thinkShow(args: ParsedArgs): Promise<CliResponse> {
  const documentId = args.positional[0];
  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);

  return wrapOperation(
    async () => {
      const result = await showThinkDocument({ documentId, basePath });
      return result;
    },
    documentId ? `Showing document: ${documentId}` : 'Showing current document'
  );
}

/**
 * think use - Switch current document
 */
async function thinkUse(args: ParsedArgs): Promise<CliResponse> {
  const documentId = args.positional[0];

  if (!documentId) {
    return error('Missing required argument: document ID');
  }

  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);

  return wrapOperation(
    async () => {
      const result = await useThinkDocument({ documentId, basePath });
      return result;
    },
    `Switched to document: ${documentId}`
  );
}

/**
 * think conclude - Conclude a thinking document
 */
async function thinkConclude(args: ParsedArgs): Promise<CliResponse> {
  const conclusion = args.positional[0];

  if (!conclusion) {
    return error('Missing required argument: conclusion text');
  }

  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);
  const documentId = getFlagString(args.flags, 'to');
  const promoteType = parsePromoteType(getFlagString(args.flags, 'promote'));

  return wrapOperation(
    async () => {
      const result = await concludeThinkDocument({
        conclusion,
        documentId,
        promote: promoteType,
        basePath,
      });
      return result;
    },
    promoteType ? `Concluded and promoted to ${promoteType}` : 'Concluded thinking document'
  );
}

/**
 * think delete - Delete a thinking document
 */
async function thinkDelete(args: ParsedArgs): Promise<CliResponse> {
  const documentId = args.positional[0];

  if (!documentId) {
    return error('Missing required argument: document ID');
  }

  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);

  return wrapOperation(
    async () => {
      const result = await deleteThinkDocument({ documentId, basePath });
      return result;
    },
    `Deleted document: ${documentId}`
  );
}
