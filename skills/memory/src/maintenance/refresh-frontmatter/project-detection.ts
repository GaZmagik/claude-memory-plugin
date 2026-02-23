/**
 * Project Detection - Detect project name from git repo or directory
 */

import { execFileSync } from 'node:child_process';
import * as path from 'node:path';

/**
 * Detect project name from git repo or directory
 */
export function detectProjectName(basePath: string): string | undefined {
  // Find the project root from .claude/memory path
  let projectRoot = basePath;
  if (basePath.includes('.claude/memory')) {
    projectRoot = basePath.split('.claude/memory')[0]!.replace(/\/$/, '');
  }

  // Try to get git repo name (using execFileSync for security)
  try {
    const remote = execFileSync('git', ['remote', 'get-url', 'origin'], {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    if (remote) {
      // Extract repo name from URL
      const match = remote.match(/\/([^/]+?)(\.git)?$/);
      if (match) {
        return match[1];
      }
    }
  } catch {
    // Not a git repo or no remote
  }

  // Fall back to directory name
  try {
    return path.basename(projectRoot);
  } catch {
    return undefined;
  }
}
