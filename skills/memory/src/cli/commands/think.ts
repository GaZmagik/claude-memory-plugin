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
  showThinkDocument,
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

  // Check for --call flag (AI invocation)
  const callAgent = getFlagString(args.flags, 'call');
  const style = getFlagString(args.flags, 'style');
  const agent = getFlagString(args.flags, 'agent');
  const resume = getFlagString(args.flags, 'resume');
  const model = getFlagString(args.flags, 'model');

  // Check for complex thought and prompt for AI assistance if interactive
  const nonInteractive = getFlagBool(args.flags, 'non-interactive') ?? false;
  const isTTY = process.stdin.isTTY ?? false;

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
