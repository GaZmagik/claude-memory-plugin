/**
 * Think Document State Management
 *
 * Tracks the current active thinking document per scope.
 * State is stored in .think-current JSON file at the scope root.
 */

import * as path from 'node:path';
import { unsafeAsThinkId } from '../types/branded.js';
import type { ThinkState } from '../types/think.js';
import { Scope } from '../types/enums.js';
import { readJsonFile, writeJsonFile, fileExists, ensureDir } from '../core/fs-utils.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('think-state');
const STATE_FILENAME = 'thought.json';

/**
 * Get the path to the state file for a given base path
 */
export function getStatePath(basePath: string): string {
  return path.join(basePath, STATE_FILENAME);
}

/**
 * Create an empty state object
 */
function createEmptyState(): ThinkState {
  return {
    currentDocumentId: null,
    currentScope: null,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Load the current state from disk
 * @param basePath - Base path where state file is stored
 * @returns ThinkState object
 */
export async function loadState(basePath: string): Promise<ThinkState> {
  const statePath = getStatePath(basePath);

  if (!(await fileExists(statePath))) {
    return createEmptyState();
  }

  const state = await readJsonFile<ThinkState>(statePath);
  if (!state) {
    log.warn('Failed to parse state file, returning empty state', { path: statePath });
    return createEmptyState();
  }

  return state;
}

/**
 * Save state to disk
 * @param basePath - Base path where state file is stored
 * @param state - State to save
 */
export async function saveState(basePath: string, state: ThinkState): Promise<void> {
  await ensureDir(basePath);
  const statePath = getStatePath(basePath);
  const updatedState: ThinkState = {
    ...state,
    lastUpdated: new Date().toISOString(),
  };
  await writeJsonFile(statePath, updatedState);
  log.debug('Saved think state', { current: state.currentDocumentId, scope: state.currentScope });
}

/**
 * Get the current document ID
 * @param basePath - Base path where state file is stored
 * @returns Current document ID or null
 */
export async function getCurrentDocumentId(basePath: string): Promise<string | null> {
  const state = await loadState(basePath);
  return state.currentDocumentId;
}

/**
 * Get the current document scope
 * @param basePath - Base path where state file is stored
 * @returns Current document scope or null
 */
export async function getCurrentScope(basePath: string): Promise<Scope | null> {
  const state = await loadState(basePath);
  return state.currentScope;
}

/**
 * Set the current document
 * @param basePath - Base path where state file is stored
 * @param documentId - Document ID to set as current
 * @param scope - Scope of the document
 */
export async function setCurrentDocument(basePath: string, documentId: string, scope: Scope): Promise<void> {
  const state = await loadState(basePath);
  state.currentDocumentId = unsafeAsThinkId(documentId);
  state.currentScope = scope;
  await saveState(basePath, state);
  log.info('Set current document', { documentId, scope });
}

/**
 * Clear the current document
 * @param basePath - Base path where state file is stored
 */
export async function clearCurrentDocument(basePath: string): Promise<void> {
  const state = await loadState(basePath);
  const previousId = state.currentDocumentId;
  state.currentDocumentId = null;
  state.currentScope = null;
  await saveState(basePath, state);
  log.info('Cleared current document', { previousId });
}

/**
 * Check if a document is the current document
 * @param basePath - Base path where state file is stored
 * @param documentId - Document ID to check
 * @returns true if this document is current
 */
export async function isCurrentDocument(basePath: string, documentId: string): Promise<boolean> {
  const state = await loadState(basePath);
  return state.currentDocumentId === documentId;
}
