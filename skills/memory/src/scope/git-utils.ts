/**
 * T045: Git repository detection utilities
 *
 * Detects whether the current directory is within a git repository
 * and finds the repository root.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Check if a directory contains a .git folder
 */
export function hasGitDirectory(dirPath: string): boolean {
  const gitPath = path.join(dirPath, '.git');
  try {
    return fs.existsSync(gitPath);
  } catch {
    return false;
  }
}

/**
 * Find the git repository root by walking up the directory tree
 * Returns null if not in a git repository
 */
export function findGitRoot(startPath: string): string | null {
  let currentPath = path.resolve(startPath);
  const root = path.parse(currentPath).root;

  while (currentPath !== root) {
    if (hasGitDirectory(currentPath)) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }

  // Check root directory as well
  if (hasGitDirectory(root)) {
    return root;
  }

  return null;
}

/**
 * Check if a path is within a git repository
 */
export function isInGitRepository(dirPath: string): boolean {
  return findGitRoot(dirPath) !== null;
}

/**
 * Get the relative path from git root to the given path
 */
export function getRelativePathFromGitRoot(targetPath: string): string | null {
  const gitRoot = findGitRoot(targetPath);
  if (!gitRoot) {
    return null;
  }
  return path.relative(gitRoot, targetPath);
}

/**
 * Get the project name from the git repository root directory name
 */
export function getProjectName(dirPath: string): string | null {
  const gitRoot = findGitRoot(dirPath);
  if (!gitRoot) {
    return null;
  }
  return path.basename(gitRoot);
}
