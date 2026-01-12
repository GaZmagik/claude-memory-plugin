/**
 * Think Document State Management
 *
 * Tracks the current active thinking document per scope.
 * State is stored in .think-current JSON file at the scope root.
 */

import * as path from 'node:path';
import type { ThinkState } from '../types/think.js';
import { Scope } from '../types/enums.js';
import { readJsonFile, writeJsonFile, fileExists, ensureDir } from '../core/fs-utils.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('think-state');
const STATE_FILENAME = '.think-current';

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
export function loadState(basePath: string): ThinkState {
  const statePath = getStatePath(basePath);

  if (!fileExists(statePath)) {
    return createEmptyState();
  }

  const state = readJsonFile<ThinkState>(statePath);
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
export function saveState(basePath: string, state: ThinkState): void {
  ensureDir(basePath);
  const statePath = getStatePath(basePath);
  const updatedState: ThinkState = {
    ...state,
    lastUpdated: new Date().toISOString(),
  };
  writeJsonFile(statePath, updatedState);
  log.debug('Saved think state', { current: state.currentDocumentId, scope: state.currentScope });
}

/**
 * Get the current document ID
 * @param basePath - Base path where state file is stored
 * @returns Current document ID or null
 */
export function getCurrentDocumentId(basePath: string): string | null {
  const state = loadState(basePath);
  return state.currentDocumentId;
}

/**
 * Get the current document scope
 * @param basePath - Base path where state file is stored
 * @returns Current document scope or null
 */
export function getCurrentScope(basePath: string): Scope | null {
  const state = loadState(basePath);
  return state.currentScope;
}

/**
 * Set the current document
 * @param basePath - Base path where state file is stored
 * @param documentId - Document ID to set as current
 * @param scope - Scope of the document
 */
export function setCurrentDocument(basePath: string, documentId: string, scope: Scope): void {
  const state = loadState(basePath);
  state.currentDocumentId = documentId;
  state.currentScope = scope;
  saveState(basePath, state);
  log.info('Set current document', { documentId, scope });
}

/**
 * Clear the current document
 * @param basePath - Base path where state file is stored
 */
export function clearCurrentDocument(basePath: string): void {
  const state = loadState(basePath);
  const previousId = state.currentDocumentId;
  state.currentDocumentId = null;
  state.currentScope = null;
  saveState(basePath, state);
  log.info('Cleared current document', { previousId });
}

/**
 * Check if a document is the current document
 * @param basePath - Base path where state file is stored
 * @param documentId - Document ID to check
 * @returns true if this document is current
 */
export function isCurrentDocument(basePath: string, documentId: string): boolean {
  const state = loadState(basePath);
  return state.currentDocumentId === documentId;
}
