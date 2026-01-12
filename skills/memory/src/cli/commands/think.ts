/**
 * CLI Commands: Think Operations
 *
 * Handlers for the think subcommand hierarchy.
 */

import * as os from 'node:os';
import * as path from 'node:path';
import type { ParsedArgs } from '../parser.js';
import { parseArgs, getFlagString } from '../parser.js';
import type { CliResponse } from '../response.js';
import { error, wrapOperation } from '../response.js';
import { Scope, ThoughtType, MemoryType } from '../../types/enums.js';
import {
  createThinkDocument,
  listThinkDocuments,
  showThinkDocument,
  deleteThinkDocument,
} from '../../think/document.js';
import { addThought } from '../../think/thoughts.js';
import { useThinkDocument } from '../../think/thoughts.js';
import { concludeThinkDocument } from '../../think/conclude.js';
import { getScopePath } from '../../scope/resolver.js';

/**
 * Get global memory path
 */
function getGlobalMemoryPath(): string {
  return path.join(os.homedir(), '.claude', 'memory');
}

/**
 * Get resolved scope path
 */
function getResolvedScopePath(scope: Scope): string {
  const cwd = process.cwd();
  const globalPath = getGlobalMemoryPath();
  return getScopePath(scope, cwd, globalPath);
}

/**
 * Parse scope string to Scope enum
 */
function parseScope(scopeStr: string | undefined): Scope {
  switch (scopeStr?.toLowerCase()) {
    case 'user':
    case 'global':
      return Scope.Global;
    case 'project':
      return Scope.Project;
    case 'local':
      return Scope.Local;
    case 'enterprise':
      return Scope.Enterprise;
    default:
      return Scope.Project;
  }
}

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

  return wrapOperation(
    async () => {
      const result = await addThought({
        thought,
        type,
        documentId,
        by,
        basePath,
        call: callAgent
          ? {
              model: callAgent,
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
