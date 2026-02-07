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
 * Ensures a directory exists, creating it recursively if necessary.
 *
 * This function first checks if the directory is accessible, and only creates
 * it if the access check fails. Uses recursive creation to handle nested paths.
 *
 * @param dirPath - The absolute or relative path to the directory to ensure exists
 * @returns A promise that resolves when the directory exists
 * @throws {Error} If directory creation fails due to permissions or other filesystem errors
 *
 * @example
 * ```typescript
 * // Ensure a nested directory structure exists
 * await ensureDir('/home/user/.claude/memory/permanent');
 *
 * // Safe to call multiple times - idempotent operation
 * await ensureDir('/tmp/cache');
 * await ensureDir('/tmp/cache'); // No-op, directory already exists
 * ```
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
 * Writes content to a file atomically by first writing to a temporary file.
 *
 * This function ensures data integrity by writing to a temporary file first,
 * then atomically renaming it to the target path. This prevents partial writes
 * or corruption if the process is interrupted. The parent directory is created
 * if it does not exist.
 *
 * @param filePath - The absolute or relative path to the target file
 * @param content - The string content to write to the file
 * @returns A promise that resolves when the file has been written
 * @throws {Error} If writing fails due to permissions, disk space, or other filesystem errors
 *
 * @example
 * ```typescript
 * // Write a memory file atomically
 * await writeFileAtomic('/home/user/.claude/memory/permanent/my-memory.md', '# Memory Title\n\nContent here');
 *
 * // Safe for concurrent access - atomic rename prevents partial reads
 * await writeFileAtomic('/tmp/config.json', JSON.stringify({ key: 'value' }));
 * ```
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
 * Reads the entire contents of a file as a UTF-8 encoded string.
 *
 * @param filePath - The absolute or relative path to the file to read
 * @returns A promise that resolves to the file contents as a string
 * @throws {Error} If the file does not exist or cannot be read (e.g., ENOENT, EACCES)
 *
 * @example
 * ```typescript
 * // Read a memory file
 * const content = await readFile('/home/user/.claude/memory/permanent/my-memory.md');
 * console.log(content); // '# Memory Title\n\nContent here'
 *
 * // Handle missing files
 * try {
 *   const data = await readFile('/nonexistent/file.txt');
 * } catch (error) {
 *   console.error('File not found');
 * }
 * ```
 */
export async function readFile(filePath: string): Promise<string> {
  return fsp.readFile(filePath, 'utf-8');
}

/**
 * Checks whether a file exists and is accessible.
 *
 * This function uses filesystem access checks rather than stat calls,
 * making it efficient for existence verification.
 *
 * @param filePath - The absolute or relative path to the file to check
 * @returns A promise that resolves to `true` if the file exists and is accessible, `false` otherwise
 *
 * @example
 * ```typescript
 * // Check if a memory file exists before reading
 * if (await fileExists('/home/user/.claude/memory/permanent/my-memory.md')) {
 *   const content = await readFile('/home/user/.claude/memory/permanent/my-memory.md');
 * }
 *
 * // Conditional creation
 * if (!(await fileExists('/tmp/config.json'))) {
 *   await writeFileAtomic('/tmp/config.json', '{}');
 * }
 * ```
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
 * Deletes a file if it exists, silently succeeding if it does not.
 *
 * This function is idempotent - calling it on a non-existent file is a no-op.
 * It first checks for file existence before attempting deletion.
 *
 * @param filePath - The absolute or relative path to the file to delete
 * @returns A promise that resolves when the operation completes (whether the file was deleted or did not exist)
 *
 * @example
 * ```typescript
 * // Delete a memory file
 * await deleteFile('/home/user/.claude/memory/temporary/old-memory.md');
 *
 * // Safe to call multiple times
 * await deleteFile('/tmp/temp-file.txt');
 * await deleteFile('/tmp/temp-file.txt'); // No error, file already gone
 * ```
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
 * Lists all Markdown files (`.md` extension) in a directory.
 *
 * Returns only regular files, not directories or other file types.
 * Returns an empty array if the directory does not exist or is inaccessible.
 *
 * @param dirPath - The absolute or relative path to the directory to scan
 * @returns A promise that resolves to an array of absolute file paths for all `.md` files
 *
 * @example
 * ```typescript
 * // List all permanent memories
 * const files = await listMarkdownFiles('/home/user/.claude/memory/permanent');
 * // Returns: ['/home/user/.claude/memory/permanent/memory-1.md', '/home/user/.claude/memory/permanent/memory-2.md']
 *
 * // Empty directory or non-existent path returns empty array
 * const empty = await listMarkdownFiles('/nonexistent/path');
 * // Returns: []
 * ```
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
 * Retrieves filesystem statistics for a file or directory.
 *
 * Returns `null` if the path does not exist or is inaccessible, rather than throwing.
 * Useful for checking file metadata like size, modification time, or type.
 *
 * @param filePath - The absolute or relative path to the file or directory
 * @returns A promise that resolves to the `fs.Stats` object, or `null` if the path is inaccessible
 *
 * @example
 * ```typescript
 * // Get file modification time
 * const stats = await getFileStats('/home/user/.claude/memory/permanent/my-memory.md');
 * if (stats) {
 *   console.log('Last modified:', stats.mtime);
 *   console.log('File size:', stats.size, 'bytes');
 * }
 *
 * // Check if path is a directory
 * const dirStats = await getFileStats('/home/user/.claude/memory');
 * if (dirStats?.isDirectory()) {
 *   console.log('Path is a directory');
 * }
 * ```
 */
export async function getFileStats(filePath: string): Promise<fs.Stats | null> {
  try {
    return await fsp.stat(filePath);
  } catch {
    return null;
  }
}

/**
 * Reads and parses a JSON file into a typed object.
 *
 * Returns `null` if the file does not exist, is inaccessible, or contains invalid JSON.
 * The generic type parameter allows for type-safe parsing.
 *
 * @typeParam T - The expected type of the parsed JSON data
 * @param filePath - The absolute or relative path to the JSON file
 * @returns A promise that resolves to the parsed data as type `T`, or `null` on any error
 *
 * @example
 * ```typescript
 * interface MemoryIndex {
 *   version: number;
 *   entries: string[];
 * }
 *
 * // Read with type safety
 * const index = await readJsonFile<MemoryIndex>('/home/user/.claude/memory/index.json');
 * if (index) {
 *   console.log('Version:', index.version);
 *   console.log('Entries:', index.entries.length);
 * }
 *
 * // Returns null for missing or invalid files
 * const missing = await readJsonFile<unknown>('/nonexistent/file.json');
 * // Returns: null
 * ```
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
 * Writes data to a JSON file atomically with pretty formatting.
 *
 * Serialises the data with 2-space indentation for readability and uses
 * atomic write operations to prevent corruption.
 *
 * @param filePath - The absolute or relative path to the JSON file
 * @param data - The data to serialise and write (must be JSON-serialisable)
 * @returns A promise that resolves when the file has been written
 * @throws {Error} If the data cannot be serialised or writing fails
 *
 * @example
 * ```typescript
 * // Write an index file
 * await writeJsonFile('/home/user/.claude/memory/index.json', {
 *   version: 1,
 *   entries: ['memory-1', 'memory-2']
 * });
 *
 * // Write an array
 * await writeJsonFile('/tmp/data.json', [1, 2, 3]);
 * ```
 */
export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await writeFileAtomic(filePath, content);
}

/**
 * Calculates the relative path from a base directory to a target path.
 *
 * Synchronous wrapper around `path.relative()` for convenience.
 *
 * @param basePath - The base directory path to calculate from
 * @param targetPath - The target path to calculate the relative path to
 * @returns The relative path from basePath to targetPath
 *
 * @example
 * ```typescript
 * // Get relative path within memory structure
 * const relative = getRelativePath('/home/user/.claude/memory', '/home/user/.claude/memory/permanent/my-memory.md');
 * // Returns: 'permanent/my-memory.md'
 *
 * // Navigate up directories
 * const up = getRelativePath('/home/user/project', '/home/user/other');
 * // Returns: '../other'
 * ```
 */
export function getRelativePath(basePath: string, targetPath: string): string {
  return path.relative(basePath, targetPath);
}

/**
 * Resolves a relative path against a base path to produce an absolute path.
 *
 * Synchronous wrapper around `path.resolve()` for convenience.
 *
 * @param basePath - The base directory path to resolve from
 * @param relativePath - The relative path to resolve
 * @returns The resolved absolute path
 *
 * @example
 * ```typescript
 * // Resolve a memory file path
 * const absolute = resolvePath('/home/user/.claude/memory', 'permanent/my-memory.md');
 * // Returns: '/home/user/.claude/memory/permanent/my-memory.md'
 *
 * // Handle parent directory references
 * const parent = resolvePath('/home/user/project/src', '../README.md');
 * // Returns: '/home/user/project/README.md'
 * ```
 */
export function resolvePath(basePath: string, relativePath: string): string {
  return path.resolve(basePath, relativePath);
}

/**
 * Extracts the filename without its extension from a file path.
 *
 * Handles both simple filenames and full paths, removing only the final extension.
 *
 * @param filePath - The file path or filename to extract the basename from
 * @returns The filename without its extension
 *
 * @example
 * ```typescript
 * // Extract memory ID from file path
 * const id = getBasename('/home/user/.claude/memory/permanent/my-memory.md');
 * // Returns: 'my-memory'
 *
 * // Works with just filenames too
 * const name = getBasename('document.txt');
 * // Returns: 'document'
 *
 * // Only removes the final extension
 * const multi = getBasename('archive.tar.gz');
 * // Returns: 'archive.tar'
 * ```
 */
export function getBasename(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

/**
 * Checks whether a target path is located inside a directory.
 *
 * This function is useful for security checks to prevent path traversal attacks.
 * It verifies that the relative path from the directory to the target does not
 * escape the directory boundary (i.e., does not start with `..`).
 *
 * @param dirPath - The directory path to check containment within
 * @param targetPath - The path to check for containment
 * @returns `true` if targetPath is inside dirPath, `false` otherwise
 *
 * @example
 * ```typescript
 * // Check if a file is within the memory directory
 * isInsideDir('/home/user/.claude/memory', '/home/user/.claude/memory/permanent/file.md');
 * // Returns: true
 *
 * // Detect path traversal attempts
 * isInsideDir('/home/user/.claude/memory', '/home/user/.claude/memory/../secrets/file.txt');
 * // Returns: false (resolves to outside the memory directory)
 *
 * // Absolute paths outside the directory
 * isInsideDir('/home/user/.claude/memory', '/etc/passwd');
 * // Returns: false
 * ```
 */
export function isInsideDir(dirPath: string, targetPath: string): boolean {
  const relative = path.relative(dirPath, targetPath);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * Checks whether a path is a symbolic link.
 *
 * Uses `lstat` to examine the link itself rather than following it.
 * Returns `false` if the path does not exist or is inaccessible.
 *
 * @param filePath - The absolute or relative path to check
 * @returns A promise that resolves to `true` if the path is a symlink, `false` otherwise
 *
 * @example
 * ```typescript
 * // Check if a memory file is actually a symlink
 * if (await isSymlink('/home/user/.claude/memory/permanent/linked-memory.md')) {
 *   console.log('This is a symbolic link');
 * }
 *
 * // Regular files return false
 * await isSymlink('/home/user/.claude/memory/permanent/regular-file.md');
 * // Returns: false
 *
 * // Non-existent paths return false
 * await isSymlink('/nonexistent/path');
 * // Returns: false
 * ```
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
 * Validates that a symlink target resolves to a path within an allowed directory.
 *
 * This is a security function to prevent symlink-based path traversal attacks.
 * If the path is not a symlink, it is returned unchanged. If it is a symlink,
 * the function resolves its real path and verifies it is within the allowed directory.
 *
 * @param filePath - The path to validate (may or may not be a symlink)
 * @param allowedBaseDir - The directory that symlink targets must resolve within
 * @returns A promise that resolves to the validated path (resolved if symlink, original if not)
 * @throws {Error} If the symlink target resolves to a path outside the allowed directory
 *
 * @example
 * ```typescript
 * // Valid symlink within allowed directory
 * const resolved = await validateSymlinkTarget(
 *   '/home/user/.claude/memory/permanent/link.md',
 *   '/home/user/.claude/memory'
 * );
 * // Returns: '/home/user/.claude/memory/permanent/actual-file.md'
 *
 * // Non-symlink passes through unchanged
 * const regular = await validateSymlinkTarget(
 *   '/home/user/.claude/memory/permanent/file.md',
 *   '/home/user/.claude/memory'
 * );
 * // Returns: '/home/user/.claude/memory/permanent/file.md'
 *
 * // Symlink pointing outside throws
 * await validateSymlinkTarget(
 *   '/home/user/.claude/memory/permanent/evil-link.md', // points to /etc/passwd
 *   '/home/user/.claude/memory'
 * );
 * // Throws: Error('Symlink target outside allowed directory: /etc/passwd')
 * ```
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
 * Retrieves all memory IDs from disk by scanning the permanent and temporary directories.
 *
 * Scans both `permanent` and `temporary` subdirectories within the base path,
 * extracting memory IDs from Markdown filenames (removing the `.md` extension).
 * Directories that do not exist are silently skipped.
 *
 * @param basePath - The base memory storage path (e.g., `/home/user/.claude/memory`)
 * @returns A promise that resolves to an array of memory IDs (filenames without `.md` extension)
 *
 * @example
 * ```typescript
 * // Get all memory IDs
 * const ids = await getAllMemoryIds('/home/user/.claude/memory');
 * // Returns: ['learning-typescript-generics', 'gotcha-async-iteration', 'temp-session-notes']
 *
 * // Empty or non-existent directories return empty array
 * const empty = await getAllMemoryIds('/nonexistent/path');
 * // Returns: []
 * ```
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
 * Finds a memory file by its ID, searching both permanent and temporary directories.
 *
 * Searches the `permanent` directory first, then `temporary`. Returns the full
 * path to the first matching file found, or `null` if no file with the given
 * ID exists in either location.
 *
 * @param basePath - The base memory storage path (e.g., `/home/user/.claude/memory`)
 * @param id - The memory ID to search for (filename without `.md` extension)
 * @returns A promise that resolves to the full path to the memory file, or `null` if not found
 *
 * @example
 * ```typescript
 * // Find a memory file
 * const path = await findMemoryFile('/home/user/.claude/memory', 'learning-typescript-generics');
 * // Returns: '/home/user/.claude/memory/permanent/learning-typescript-generics.md'
 *
 * // Check temporary directory if not in permanent
 * const temp = await findMemoryFile('/home/user/.claude/memory', 'temp-session-notes');
 * // Returns: '/home/user/.claude/memory/temporary/temp-session-notes.md'
 *
 * // Non-existent memory returns null
 * const missing = await findMemoryFile('/home/user/.claude/memory', 'nonexistent-memory');
 * // Returns: null
 * ```
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
