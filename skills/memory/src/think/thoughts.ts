/**
 * Think Thought Operations
 *
 * Add thoughts, counter-arguments, and branches to thinking documents.
 */

import * as path from 'node:path';
import type {
  ThinkAddRequest,
  ThinkAddResponse,
  ThinkUseRequest,
  ThinkUseResponse,
} from '../types/api.js';
import type { ThoughtEntry } from '../types/think.js';
import { Scope, ThoughtType } from '../types/enums.js';
import {
  parseThinkDocument,
  serialiseThinkDocument,
  formatThought,
} from './frontmatter.js';
import {
  getCurrentDocumentId,
  setCurrentDocument,
  loadState,
} from './state.js';
import { thinkDocumentExists, getThinkFilePath } from './document.js';
import { validateThinkAdd, validateThinkUse } from './validation.js';
import { writeFileAtomic, readFile, fileExists } from '../core/fs-utils.js';
import { getScopePath } from '../scope/resolver.js';
import { createLogger } from '../core/logger.js';
import { invokeAI } from './ai-invoke.js';

const log = createLogger('think-thoughts');

/**
 * Get scope path from context
 */
function resolveScopePath(scope: Scope, basePath: string, globalPath: string): string {
  return getScopePath(scope, basePath, globalPath);
}

/**
 * Add a thought to a thinking document
 */
export async function addThought(
  request: ThinkAddRequest
): Promise<ThinkAddResponse> {
  const validation = validateThinkAdd(request);
  if (!validation.valid) {
    const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join('; ');
    log.error('Validation failed', { errors: errorMessages });
    return {
      status: 'error',
      error: errorMessages,
    };
  }

  const basePath = request.basePath ?? process.cwd();
  const globalPath = path.join(process.env.HOME ?? '', '.claude', 'memory');

  // Determine target document
  let documentId = request.documentId;
  let documentScope: Scope | undefined;

  if (!documentId) {
    // Find current document from either scope
    for (const scope of [Scope.Project, Scope.Local]) {
      const scopePath = resolveScopePath(scope, basePath, globalPath);
      const currentId = await getCurrentDocumentId(scopePath);
      if (currentId) {
        documentId = currentId;
        documentScope = scope;
        break;
      }
    }
  }

  if (!documentId) {
    return {
      status: 'error',
      error: 'No document specified and no current document set. Create one with thinkCreate()',
    };
  }

  // Find the document if scope not determined
  if (!documentScope) {
    const result = await thinkDocumentExists(documentId, basePath, globalPath);
    if (!result.exists || !result.scope) {
      return {
        status: 'error',
        error: `Think document not found: ${documentId}`,
      };
    }
    documentScope = result.scope;
  }

  const scopePath = resolveScopePath(documentScope, basePath, globalPath);
  const filePath = getThinkFilePath(scopePath, documentId);

  if (!(await fileExists(filePath))) {
    return {
      status: 'error',
      error: `Think document not found: ${documentId}`,
    };
  }

  try {
    // Read and parse existing document
    const content = await readFile(filePath);
    const parsed = parseThinkDocument(content);

    // Check if document is still active
    if (parsed.frontmatter.status !== 'active') {
      return {
        status: 'error',
        error: `Cannot add thought to concluded document: ${documentId}`,
      };
    }

    // Handle AI invocation if --call option provided
    let thoughtContent = request.thought;
    let attribution = request.by;

    if (request.call) {
      log.info('Invoking AI for thought', { documentId, type: request.type });

      const aiResult = await invokeAI({
        topic: parsed.frontmatter.topic,
        thoughtType: request.type,
        existingThoughts: parsed.thoughts ?? [],
        options: {
          ...request.call,
          guidance: request.thought, // User's text becomes guidance for AI
        },
        basePath,
      });

      if (!aiResult.success) {
        return {
          status: 'error',
          error: `AI invocation failed: ${aiResult.error}`,
        };
      }

      thoughtContent = aiResult.content ?? '';
      // Auto-set attribution with model, style, and session ID
      const model = request.call.model ?? 'haiku';
      const style = request.call.outputStyle;
      const agent = request.call.agent;

      // Build attribution string with explicit labels: model:X style:Y agent:Z [session]
      const parts: string[] = [`model:${model}`];
      if (style) parts.push(`style:${style}`);
      if (agent) parts.push(`agent:${agent}`);
      if (aiResult.sessionId) parts.push(`[${aiResult.sessionId}]`);
      attribution = parts.join(' ');

      log.info('AI thought generated', { documentId, sessionId: aiResult.sessionId, style, agent });
    }

    const timestamp = new Date().toISOString();

    // Create thought entry
    const entry: ThoughtEntry = {
      timestamp,
      type: request.type,
      content: thoughtContent,
    };

    if (attribution) {
      entry.by = attribution;
    }

    // Add AI metadata if this was an AI-generated thought
    if (request.call) {
      if (request.call.outputStyle) {
        entry.outputStyle = request.call.outputStyle;
      }
      if (request.call.agent) {
        entry.agent = request.call.agent;
      }
    }

    // Format the thought as markdown
    const thoughtMarkdown = formatThought(entry);

    // Append thought to content
    const updatedContent = parsed.rawContent + '\n\n' + thoughtMarkdown;

    // Update frontmatter timestamp
    const updatedFrontmatter = {
      ...parsed.frontmatter,
      updated: timestamp,
    };

    // Write back
    const fileContent = serialiseThinkDocument(updatedFrontmatter, updatedContent);
    await writeFileAtomic(filePath, fileContent);

    log.info('Added thought', { documentId, type: request.type });

    return {
      status: 'success',
      thought: entry,
      documentId,
    };
  } catch (error) {
    log.error('Failed to add thought', { documentId, error: String(error) });
    return {
      status: 'error',
      error: `Failed to add thought: ${String(error)}`,
    };
  }
}

/**
 * Add a counter-argument (convenience wrapper)
 */
export async function addCounterArgument(
  request: Omit<ThinkAddRequest, 'type'>
): Promise<ThinkAddResponse> {
  return addThought({
    ...request,
    type: ThoughtType.CounterArgument,
  });
}

/**
 * Add a branch/alternative (convenience wrapper)
 */
export async function addBranch(
  request: Omit<ThinkAddRequest, 'type'>
): Promise<ThinkAddResponse> {
  return addThought({
    ...request,
    type: ThoughtType.Branch,
  });
}

/**
 * Switch current document
 */
export async function useThinkDocument(
  request: ThinkUseRequest
): Promise<ThinkUseResponse> {
  const validation = validateThinkUse(request);
  if (!validation.valid) {
    const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join('; ');
    return {
      status: 'error',
      error: errorMessages,
    };
  }

  const basePath = request.basePath ?? process.cwd();
  const globalPath = path.join(process.env.HOME ?? '', '.claude', 'memory');
  const documentId = request.documentId;

  // Find the document
  const result = await thinkDocumentExists(documentId, basePath, globalPath);
  if (!result.exists || !result.scope || !result.filePath) {
    return {
      status: 'error',
      error: `Think document not found: ${documentId}`,
    };
  }

  const scopePath = resolveScopePath(result.scope, basePath, globalPath);

  // Get previous current
  const previousId = await getCurrentDocumentId(scopePath);

  // Read document to get topic
  const content = await readFile(result.filePath);
  const parsed = parseThinkDocument(content);

  // Set as current
  await setCurrentDocument(scopePath, documentId, result.scope);

  log.info('Switched current document', { documentId, previousId });

  return {
    status: 'success',
    previousId,
    currentId: documentId,
    topic: parsed.frontmatter.topic,
  };
}

/**
 * Get the current document's topic and ID
 */
export async function getCurrentThinkContext(
  basePath: string,
  globalPath: string
): Promise<{ documentId: string; scope: Scope; topic: string } | null> {
  for (const scope of [Scope.Project, Scope.Local]) {
    const scopePath = resolveScopePath(scope, basePath, globalPath);
    const state = await loadState(scopePath);

    if (state.currentDocumentId) {
      const filePath = getThinkFilePath(scopePath, state.currentDocumentId);
      if (await fileExists(filePath)) {
        try {
          const content = await readFile(filePath);
          const parsed = parseThinkDocument(content);
          return {
            documentId: state.currentDocumentId,
            scope,
            topic: parsed.frontmatter.topic,
          };
        } catch {
          continue;
        }
      }
    }
  }
  return null;
}
