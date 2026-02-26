/**
 * Filesystem utilities for hooks
 *
 * Shared async filesystem helpers used across hook modules.
 */

import { stat } from 'node:fs/promises';

/**
 * Check if a path exists (async alternative to existsSync).
 *
 * @param p - Path to check
 * @returns `true` if the path exists, `false` otherwise
 */
export async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}
