/**
 * Think Migration - Migrate think- prefixed IDs to thought- prefix
 *
 * Helpers to rename think-* files and update all JSON state files
 * (thought.json, graph.json, index.json) with the new IDs.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Migrate a think- prefixed ID to thought- prefix
 */
export function migrateThinkId(id: string): string {
  if (id.startsWith('think-')) {
    return 'thought-' + id.slice(6);
  }
  return id;
}

/**
 * Update thought.json state file with migrated IDs
 */
export function migrateThoughtJsonState(
  basePath: string,
  oldId: string,
  newId: string,
  dryRun: boolean
): boolean {
  const statePath = path.join(basePath, 'thought.json');
  if (!fs.existsSync(statePath)) {
    return false;
  }

  try {
    const content = fs.readFileSync(statePath, 'utf-8');
    const state = JSON.parse(content);

    if (state.currentDocumentId === oldId) {
      if (!dryRun) {
        state.currentDocumentId = newId;
        fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
      }
      return true;
    }
  } catch (err) {
    process.stderr.write(`[think-migration] Failed to update thought.json (${statePath}): ${err instanceof Error ? err.message : String(err)}\n`);
  }
  return false;
}

/**
 * Update graph.json with migrated IDs
 */
export function migrateGraphJson(
  basePath: string,
  oldId: string,
  newId: string,
  dryRun: boolean
): boolean {
  const graphPath = path.join(basePath, 'graph.json');
  if (!fs.existsSync(graphPath)) {
    return false;
  }

  try {
    const content = fs.readFileSync(graphPath, 'utf-8');
    if (!content.includes(`"${oldId}"`)) {
      return false;
    }

    if (!dryRun) {
      const escaped = oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const updated = content.replace(new RegExp(`"${escaped}"`, 'g'), `"${newId}"`);
      fs.writeFileSync(graphPath, updated);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Update index.json with migrated IDs and paths
 */
export function migrateIndexJson(
  basePath: string,
  oldId: string,
  newId: string,
  dryRun: boolean
): boolean {
  const indexPath = path.join(basePath, 'index.json');
  if (!fs.existsSync(indexPath)) {
    return false;
  }

  try {
    const content = fs.readFileSync(indexPath, 'utf-8');
    if (!content.includes(`"${oldId}"`)) {
      return false;
    }

    if (!dryRun) {
      // Replace ID and file paths
      const escaped = oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let updated = content.replace(new RegExp(`"${escaped}"`, 'g'), `"${newId}"`);
      updated = updated.replace(
        new RegExp(`temporary/${escaped}\\.md`, 'g'),
        `temporary/${newId}.md`
      );
      fs.writeFileSync(indexPath, updated);
    }
    return true;
  } catch {
    return false;
  }
}
