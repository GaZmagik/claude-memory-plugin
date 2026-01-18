/**
 * T026: File System Utilities
 *
 * Atomic file operations for memory storage.
 */

import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { createLogger } from './logger.js';

const log = createLogger('fs-utils');

/**
 * Ensure a directory exists, creating it if necessary
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fsp.access(dirPath);
  } catch {
    await fsp.mkdir(dirPath, { recursive: true });
    log.debug('Created directory', { path: dirPath });
  }
}

/**
 * Write a file atomically by writing to a temp file first
 */
export async function writeFileAtomic(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDir(dir);

  const tempPath = `${filePath}.tmp.${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    await fsp.writeFile(tempPath, content, 'utf-8');
    await fsp.rename(tempPath, filePath);
    log.debug('Wrote file atomically', { path: filePath });
  } catch (error) {
    // Clean up temp file if it exists
    try {
      await fsp.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Read a file's contents
 */
export async function readFile(filePath: string): Promise<string> {
  return fsp.readFile(filePath, 'utf-8');
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a file
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fsp.access(filePath);
    await fsp.unlink(filePath);
    log.debug('Deleted file', { path: filePath });
  } catch {
    // File doesn't exist, nothing to delete
  }
}

/**
 * List all markdown files in a directory
 */
export async function listMarkdownFiles(dirPath: string): Promise<string[]> {
  try {
    await fsp.access(dirPath);
  } catch {
    return [];
  }

  const entries = await fsp.readdir(dirPath, { withFileTypes: true });

  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => path.join(dirPath, entry.name));
}

/**
 * Get file stats
 */
export async function getFileStats(filePath: string): Promise<fs.Stats | null> {
  try {
    return await fsp.stat(filePath);
  } catch {
    return null;
  }
}

/**
 * Read JSON file with error handling
 */
export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fsp.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Write JSON file atomically
 */
export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await writeFileAtomic(filePath, content);
}

/**
 * Get relative path from base to target
 */
export function getRelativePath(basePath: string, targetPath: string): string {
  return path.relative(basePath, targetPath);
}

/**
 * Resolve a relative path against a base path
 */
export function resolvePath(basePath: string, relativePath: string): string {
  return path.resolve(basePath, relativePath);
}

/**
 * Get the filename without extension
 */
export function getBasename(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

/**
 * Check if a path is inside a directory
 */
export function isInsideDir(dirPath: string, targetPath: string): boolean {
  const relative = path.relative(dirPath, targetPath);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * Check if a path is a symlink
 */
export async function isSymlink(filePath: string): Promise<boolean> {
  try {
    const stats = await fsp.lstat(filePath);
    return stats.isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Validate that a symlink target is within allowed directory
 * Returns the resolved path if valid, throws if invalid
 */
export async function validateSymlinkTarget(filePath: string, allowedBaseDir: string): Promise<string> {
  if (!(await isSymlink(filePath))) {
    return filePath; // Not a symlink, return as-is
  }

  const resolvedPath = await fsp.realpath(filePath);
  if (!isInsideDir(allowedBaseDir, resolvedPath)) {
    throw new Error(`Symlink target outside allowed directory: ${resolvedPath}`);
  }

  return resolvedPath;
}

/**
 * Memory storage subdirectories
 */
export const MEMORY_SUBDIRS = ['permanent', 'temporary'] as const;

/**
 * Get all memory IDs from disk by scanning permanent and temporary directories
 *
 * @param basePath - Base memory storage path (e.g., .claude/memory)
 * @returns Array of memory IDs (filenames without .md extension)
 */
export async function getAllMemoryIds(basePath: string): Promise<string[]> {
  const ids: string[] = [];

  for (const subdir of MEMORY_SUBDIRS) {
    const dir = path.join(basePath, subdir);
    try {
      await fsp.access(dir);
    } catch {
      continue;
    }

    const files = await fsp.readdir(dir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        ids.push(file.replace('.md', ''));
      }
    }
  }

  return ids;
}

/**
 * Find a memory file by ID, searching both permanent and temporary directories
 *
 * @param basePath - Base memory storage path
 * @param id - Memory ID
 * @returns Full path to the memory file, or null if not found
 */
export async function findMemoryFile(basePath: string, id: string): Promise<string | null> {
  for (const subdir of MEMORY_SUBDIRS) {
    const filePath = path.join(basePath, subdir, `${id}.md`);
    try {
      await fsp.access(filePath);
      return filePath;
    } catch {
      continue;
    }
  }
  return null;
}
