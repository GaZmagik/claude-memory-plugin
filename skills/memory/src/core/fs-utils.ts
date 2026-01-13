/**
 * T026: File System Utilities
 *
 * Atomic file operations for memory storage.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createLogger } from './logger.js';

const log = createLogger('fs-utils');

/**
 * Ensure a directory exists, creating it if necessary
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log.debug('Created directory', { path: dirPath });
  }
}

/**
 * Write a file atomically by writing to a temp file first
 */
export function writeFileAtomic(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  ensureDir(dir);

  const tempPath = `${filePath}.tmp.${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    fs.writeFileSync(tempPath, content, 'utf-8');
    fs.renameSync(tempPath, filePath);
    log.debug('Wrote file atomically', { path: filePath });
  } catch (error) {
    // Clean up temp file if it exists
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw error;
  }
}

/**
 * Read a file's contents
 */
export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Check if a file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Delete a file
 */
export function deleteFile(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    log.debug('Deleted file', { path: filePath });
  }
}

/**
 * List all markdown files in a directory
 */
export function listMarkdownFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => path.join(dirPath, entry.name));
}

/**
 * Get file stats
 */
export function getFileStats(filePath: string): fs.Stats | null {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

/**
 * Read JSON file with error handling
 */
export function readJsonFile<T>(filePath: string): T | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Write JSON file atomically
 */
export function writeJsonFile(filePath: string, data: unknown): void {
  const content = JSON.stringify(data, null, 2);
  writeFileAtomic(filePath, content);
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
export function isSymlink(filePath: string): boolean {
  try {
    const stats = fs.lstatSync(filePath);
    return stats.isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Validate that a symlink target is within allowed directory
 * Returns the resolved path if valid, throws if invalid
 */
export function validateSymlinkTarget(filePath: string, allowedBaseDir: string): string {
  if (!isSymlink(filePath)) {
    return filePath; // Not a symlink, return as-is
  }

  const resolvedPath = fs.realpathSync(filePath);
  if (!isInsideDir(allowedBaseDir, resolvedPath)) {
    throw new Error(`Symlink target outside allowed directory: ${resolvedPath}`);
  }

  return resolvedPath;
}
