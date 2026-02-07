/**
 * T045: Git repository detection utilities
 *
 * Detects whether the current directory is within a git repository
 * and finds the repository root.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Checks whether a given directory contains a `.git` folder, indicating
 * it is the root of a Git repository.
 *
 * This function performs a synchronous filesystem check and handles any
 * errors gracefully by returning false.
 *
 * @param dirPath - The absolute or relative path to the directory to check
 * @returns `true` if the directory contains a `.git` folder, `false` otherwise
 *
 * @example
 * ```typescript
 * import { hasGitDirectory } from './git-utils';
 *
 * // Check if current directory is a git root
 * if (hasGitDirectory('/home/user/my-project')) {
 *   console.log('This is a git repository root');
 * }
 *
 * // Returns false for non-git directories
 * hasGitDirectory('/tmp'); // false
 * ```
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
 * Finds the root directory of a Git repository by traversing up the directory
 * tree from a given starting path.
 *
 * The function walks up the directory hierarchy checking each directory for
 * a `.git` folder until it either finds one (returning that directory) or
 * reaches the filesystem root (returning `null`).
 *
 * @param startPath - The absolute or relative path to start searching from.
 *                    This is typically a file or directory within the repository.
 * @returns The absolute path to the Git repository root directory, or `null`
 *          if the starting path is not within a Git repository
 *
 * @example
 * ```typescript
 * import { findGitRoot } from './git-utils';
 *
 * // Find git root from a nested directory
 * const root = findGitRoot('/home/user/my-project/src/components');
 * console.log(root); // '/home/user/my-project'
 *
 * // Returns null when not in a git repository
 * const notInRepo = findGitRoot('/tmp/random-folder');
 * console.log(notInRepo); // null
 *
 * // Works with relative paths (resolved against cwd)
 * const fromRelative = findGitRoot('./src');
 * ```
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
 * Determines whether a given path is located within a Git repository.
 *
 * This is a convenience function that wraps {@link findGitRoot} and returns
 * a boolean result. Use this when you only need to know if a path is within
 * a repository, without needing the actual root path.
 *
 * @param dirPath - The absolute or relative path to check. Can be a file or
 *                  directory path.
 * @returns `true` if the path is within a Git repository, `false` otherwise
 *
 * @example
 * ```typescript
 * import { isInGitRepository } from './git-utils';
 *
 * // Check before performing git-dependent operations
 * if (isInGitRepository(process.cwd())) {
 *   console.log('Safe to perform git operations');
 * } else {
 *   console.log('Not in a git repository');
 * }
 *
 * // Useful for conditional logic
 * const scope = isInGitRepository(targetPath) ? 'project' : 'global';
 * ```
 */
export function isInGitRepository(dirPath: string): boolean {
  return findGitRoot(dirPath) !== null;
}

/**
 * Calculates the relative path from the Git repository root to a given target path.
 *
 * This function first locates the Git repository root, then computes the relative
 * path from that root to the specified target. Useful for storing or displaying
 * paths in a repository-relative format.
 *
 * @param targetPath - The absolute or relative path for which to calculate the
 *                     relative path from the Git root
 * @returns The relative path from the Git root to the target, or `null` if the
 *          target path is not within a Git repository. Returns an empty string
 *          if the target is the repository root itself.
 *
 * @example
 * ```typescript
 * import { getRelativePathFromGitRoot } from './git-utils';
 *
 * // Get relative path for a nested file
 * const relativePath = getRelativePathFromGitRoot('/home/user/my-project/src/index.ts');
 * console.log(relativePath); // 'src/index.ts'
 *
 * // Returns empty string for the root itself
 * const rootPath = getRelativePathFromGitRoot('/home/user/my-project');
 * console.log(rootPath); // ''
 *
 * // Returns null when not in a repository
 * const notInRepo = getRelativePathFromGitRoot('/tmp/file.txt');
 * console.log(notInRepo); // null
 * ```
 */
export function getRelativePathFromGitRoot(targetPath: string): string | null {
  const gitRoot = findGitRoot(targetPath);
  if (!gitRoot) {
    return null;
  }
  return path.relative(gitRoot, targetPath);
}

/**
 * Extracts the project name from the Git repository root directory name.
 *
 * This function locates the Git repository root and returns its directory name,
 * which is commonly used as the project identifier. This is useful for naming
 * project-scoped resources or displaying project context to users.
 *
 * @param dirPath - The absolute or relative path from which to derive the
 *                  project name. Can be any path within the Git repository.
 * @returns The name of the Git repository root directory (i.e., the project name),
 *          or `null` if the path is not within a Git repository
 *
 * @example
 * ```typescript
 * import { getProjectName } from './git-utils';
 *
 * // Get project name from any path within the repository
 * const projectName = getProjectName('/home/user/my-awesome-project/src/utils');
 * console.log(projectName); // 'my-awesome-project'
 *
 * // Works from the root directory too
 * const fromRoot = getProjectName('/home/user/my-awesome-project');
 * console.log(fromRoot); // 'my-awesome-project'
 *
 * // Returns null when not in a repository
 * const notInRepo = getProjectName('/tmp');
 * console.log(notInRepo); // null
 *
 * // Useful for scoping resources
 * const memoryPath = `.claude/memory/${getProjectName(cwd) ?? 'global'}`;
 * ```
 */
export function getProjectName(dirPath: string): string | null {
  const gitRoot = findGitRoot(dirPath);
  if (!gitRoot) {
    return null;
  }
  return path.basename(gitRoot);
}
