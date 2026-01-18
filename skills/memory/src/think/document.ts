/**
 * Think Document CRUD Operations
 *
 * Create, read, list, and delete thinking documents.
 */

import * as path from 'node:path';
import type {
  ThinkCreateRequest,
  ThinkCreateResponse,
  ThinkListRequest,
  ThinkListResponse,
  ThinkShowRequest,
  ThinkShowResponse,
  ThinkDeleteRequest,
  ThinkDeleteResponse,
} from '../types/api.js';
import { unsafeAsThinkId } from '../types/branded.js';
import type { ThinkDocument, ThinkDocumentSummary } from '../types/think.js';
import { Scope } from '../types/enums.js';
import { generateThinkId, isValidThinkId } from './id-generator.js';
import {
  createThinkFrontmatter,
  generateInitialContent,
  serialiseThinkDocument,
  parseThinkDocument,
} from './frontmatter.js';
import {
  loadState,
  setCurrentDocument,
  getCurrentDocumentId,
  clearCurrentDocument,
} from './state.js';
import { validateThinkCreate, validateThinkDelete } from './validation.js';
import {
  writeFileAtomic,
  ensureDir,
  readFile,
  fileExists,
  deleteFile,
  listMarkdownFiles,
} from '../core/fs-utils.js';
import { getScopePath } from '../scope/resolver.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('think-document');

/**
 * Get the temporary directory path for a scope
 */
export function getTemporaryDir(scopePath: string): string {
  return path.join(scopePath, 'temporary');
}

/**
 * Get the file path for a think document
 */
export function getThinkFilePath(scopePath: string, documentId: string): string {
  return path.join(getTemporaryDir(scopePath), `${documentId}.md`);
}

/**
 * Get scope path from context
 */
function resolveScopePath(scope: Scope, basePath: string, globalPath: string): string {
  return getScopePath(scope, basePath, globalPath);
}

/**
 * Create a new thinking document
 */
export async function createThinkDocument(
  request: ThinkCreateRequest
): Promise<ThinkCreateResponse> {
  const validation = validateThinkCreate(request);
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
  const scope = request.scope ?? Scope.Project;
  const scopePath = resolveScopePath(scope, basePath, globalPath);

  try {
    const temporaryDir = getTemporaryDir(scopePath);
    await ensureDir(temporaryDir);

    const id = generateThinkId();
    const frontmatter = createThinkFrontmatter({
      topic: request.topic,
      scope,
    });
    const content = generateInitialContent(request.topic);
    const fileContent = serialiseThinkDocument(frontmatter, content);

    const filePath = path.join(temporaryDir, `${id}.md`);
    await writeFileAtomic(filePath, fileContent);

    // Set as current document
    await setCurrentDocument(scopePath, id, scope);

    log.info('Created think document', { id, topic: request.topic, scope });

    return {
      status: 'success',
      document: {
        id,
        filePath,
        topic: request.topic,
        scope,
      },
    };
  } catch (error) {
    log.error('Failed to create think document', { error: String(error) });
    return {
      status: 'error',
      error: `Failed to create think document: ${String(error)}`,
    };
  }
}

/**
 * List all thinking documents
 */
export async function listThinkDocuments(
  request: ThinkListRequest
): Promise<ThinkListResponse> {
  const basePath = request.basePath ?? process.cwd();
  const globalPath = path.join(process.env.HOME ?? '', '.claude', 'memory');

  const documents: ThinkDocumentSummary[] = [];

  // Determine which scopes to search
  const scopesToSearch: Scope[] = request.scope
    ? [request.scope]
    : [Scope.Project, Scope.Local];

  for (const scope of scopesToSearch) {
    const scopePath = resolveScopePath(scope, basePath, globalPath);
    const temporaryDir = getTemporaryDir(scopePath);

    if (!(await fileExists(temporaryDir))) {
      continue;
    }

    const files = await listMarkdownFiles(temporaryDir);
    const state = await loadState(scopePath);

    for (const filePath of files) {
      const filename = path.basename(filePath, '.md');

      // Only include think documents
      if (!isValidThinkId(filename)) {
        continue;
      }

      try {
        const content = await readFile(filePath);
        const parsed = parseThinkDocument(content);

        // Filter by status if requested
        if (request.status && parsed.frontmatter.status !== request.status) {
          continue;
        }

        documents.push({
          id: filename,
          topic: parsed.frontmatter.topic,
          status: parsed.frontmatter.status,
          scope,
          thoughtCount: parsed.thoughts.length,
          created: parsed.frontmatter.created,
          updated: parsed.frontmatter.updated,
          isCurrent: state.currentDocumentId === filename,
        });
      } catch (error) {
        log.warn('Failed to parse think document', { filePath, error: String(error) });
      }
    }
  }

  // Sort by updated timestamp (most recent first)
  documents.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());

  // Determine current document ID across scopes
  let currentId: string | null = null;
  for (const scope of scopesToSearch) {
    const scopePath = resolveScopePath(scope, basePath, globalPath);
    const id = await getCurrentDocumentId(scopePath);
    if (id) {
      currentId = id;
      break;
    }
  }

  return {
    status: 'success',
    documents,
    currentId,
  };
}

/**
 * Show a thinking document
 */
export async function showThinkDocument(
  request: ThinkShowRequest
): Promise<ThinkShowResponse> {
  const basePath = request.basePath ?? process.cwd();
  const globalPath = path.join(process.env.HOME ?? '', '.claude', 'memory');

  // Determine document ID and scope
  let documentId = request.documentId;
  let documentScope: Scope | null = null;

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
      error: 'No document specified and no current document set',
    };
  }

  // Find the document
  if (!documentScope) {
    // Search both scopes
    for (const scope of [Scope.Project, Scope.Local]) {
      const scopePath = resolveScopePath(scope, basePath, globalPath);
      const filePath = getThinkFilePath(scopePath, documentId);
      if (await fileExists(filePath)) {
        documentScope = scope;
        break;
      }
    }
  }

  if (!documentScope) {
    return {
      status: 'error',
      error: `Think document not found: ${documentId}`,
    };
  }

  const scopePath = resolveScopePath(documentScope, basePath, globalPath);
  const filePath = getThinkFilePath(scopePath, documentId);

  try {
    const content = await readFile(filePath);
    const parsed = parseThinkDocument(content);

    const document: ThinkDocument = {
      id: unsafeAsThinkId(documentId),
      frontmatter: parsed.frontmatter,
      thoughts: parsed.thoughts,
      rawContent: parsed.rawContent,
      filePath,
    };

    return {
      status: 'success',
      document,
    };
  } catch (error) {
    log.error('Failed to read think document', { documentId, error: String(error) });
    return {
      status: 'error',
      error: `Failed to read think document: ${String(error)}`,
    };
  }
}

/**
 * Delete a thinking document
 */
export async function deleteThinkDocument(
  request: ThinkDeleteRequest
): Promise<ThinkDeleteResponse> {
  const validation = validateThinkDelete(request);
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

  // Find the document in either scope
  let documentScope: Scope | null = null;
  for (const scope of [Scope.Project, Scope.Local]) {
    const scopePath = resolveScopePath(scope, basePath, globalPath);
    const filePath = getThinkFilePath(scopePath, documentId);
    if (await fileExists(filePath)) {
      documentScope = scope;
      break;
    }
  }

  if (!documentScope) {
    return {
      status: 'error',
      error: `Think document not found: ${documentId}`,
    };
  }

  const scopePath = resolveScopePath(documentScope, basePath, globalPath);
  const filePath = getThinkFilePath(scopePath, documentId);

  try {
    await deleteFile(filePath);

    // Clear current if this was the current document
    const currentId = await getCurrentDocumentId(scopePath);
    if (currentId === documentId) {
      await clearCurrentDocument(scopePath);
    }

    log.info('Deleted think document', { documentId });

    return {
      status: 'success',
      deletedId: documentId,
    };
  } catch (error) {
    log.error('Failed to delete think document', { documentId, error: String(error) });
    return {
      status: 'error',
      error: `Failed to delete think document: ${String(error)}`,
    };
  }
}

/**
 * Check if a think document exists
 */
export async function thinkDocumentExists(
  documentId: string,
  basePath: string,
  globalPath: string
): Promise<{ exists: boolean; scope?: Scope; filePath?: string }> {
  for (const scope of [Scope.Project, Scope.Local]) {
    const scopePath = resolveScopePath(scope, basePath, globalPath);
    const filePath = getThinkFilePath(scopePath, documentId);
    if (await fileExists(filePath)) {
      return { exists: true, scope, filePath };
    }
  }
  return { exists: false };
}

/**
 * Get the raw content of a think document
 */
export async function readThinkDocumentRaw(
  documentId: string,
  basePath: string,
  globalPath: string
): Promise<{ content: string; scope: Scope; filePath: string } | null> {
  const result = await thinkDocumentExists(documentId, basePath, globalPath);
  if (!result.exists || !result.scope || !result.filePath) {
    return null;
  }

  const content = await readFile(result.filePath);
  return {
    content,
    scope: result.scope,
    filePath: result.filePath,
  };
}
