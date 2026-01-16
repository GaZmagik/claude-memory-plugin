/**
 * T027: Unit tests for file system utilities
 *
 * Tests atomic file operations for memory storage.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  ensureDir,
  writeFileAtomic,
  readFile,
  fileExists,
  deleteFile,
  listMarkdownFiles,
  getFileStats,
  readJsonFile,
  writeJsonFile,
  getRelativePath,
  resolvePath,
  getBasename,
  isInsideDir,
  isSymlink,
  validateSymlinkTarget,
  getAllMemoryIds,
  findMemoryFile,
  MEMORY_SUBDIRS,
} from './fs-utils.js';

describe('File System Utilities', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-utils-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('ensureDir', () => {
    it('should create directory if it does not exist', () => {
      const newDir = path.join(testDir, 'new-dir');

      ensureDir(newDir);

      expect(fs.existsSync(newDir)).toBe(true);
    });

    it('should create nested directories', () => {
      const nestedDir = path.join(testDir, 'a', 'b', 'c');

      ensureDir(nestedDir);

      expect(fs.existsSync(nestedDir)).toBe(true);
    });

    it('should not fail if directory already exists', () => {
      const existingDir = path.join(testDir, 'existing');
      fs.mkdirSync(existingDir);

      expect(() => ensureDir(existingDir)).not.toThrow();
    });
  });

  describe('writeFileAtomic', () => {
    it('should write content to file', () => {
      const filePath = path.join(testDir, 'test.txt');

      writeFileAtomic(filePath, 'hello world');

      expect(fs.readFileSync(filePath, 'utf-8')).toBe('hello world');
    });

    it('should create parent directories if needed', () => {
      const filePath = path.join(testDir, 'nested', 'dir', 'test.txt');

      writeFileAtomic(filePath, 'content');

      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('content');
    });

    it('should overwrite existing file', () => {
      const filePath = path.join(testDir, 'overwrite.txt');
      fs.writeFileSync(filePath, 'old content');

      writeFileAtomic(filePath, 'new content');

      expect(fs.readFileSync(filePath, 'utf-8')).toBe('new content');
    });

    it('should clean up temp file on error', () => {
      const filePath = path.join(testDir, 'readonly-dir', 'test.txt');
      const readonlyDir = path.join(testDir, 'readonly-dir');
      fs.mkdirSync(readonlyDir);

      // Make directory read-only (this test may not work on all systems)
      try {
        fs.chmodSync(readonlyDir, 0o444);

        // Skip test if we can't restrict permissions (e.g., root user)
        if (process.getuid && process.getuid() === 0) {
          fs.chmodSync(readonlyDir, 0o755);
          return;
        }

        expect(() => writeFileAtomic(filePath, 'content')).toThrow();

        // Verify no temp files left behind
        fs.chmodSync(readonlyDir, 0o755);
        const files = fs.readdirSync(readonlyDir);
        expect(files.filter(f => f.includes('.tmp.'))).toHaveLength(0);
      } catch {
        // Restore permissions for cleanup
        fs.chmodSync(readonlyDir, 0o755);
      }
    });
  });

  describe('readFile', () => {
    it('should read file contents', () => {
      const filePath = path.join(testDir, 'read.txt');
      fs.writeFileSync(filePath, 'file content');

      const content = readFile(filePath);

      expect(content).toBe('file content');
    });

    it('should throw on non-existent file', () => {
      expect(() => readFile(path.join(testDir, 'missing.txt'))).toThrow();
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', () => {
      const filePath = path.join(testDir, 'exists.txt');
      fs.writeFileSync(filePath, 'content');

      expect(fileExists(filePath)).toBe(true);
    });

    it('should return false for non-existent file', () => {
      expect(fileExists(path.join(testDir, 'missing.txt'))).toBe(false);
    });
  });

  describe('deleteFile', () => {
    it('should delete existing file', () => {
      const filePath = path.join(testDir, 'delete-me.txt');
      fs.writeFileSync(filePath, 'content');

      deleteFile(filePath);

      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should not throw on non-existent file', () => {
      expect(() => deleteFile(path.join(testDir, 'missing.txt'))).not.toThrow();
    });
  });

  describe('listMarkdownFiles', () => {
    it('should list markdown files in directory', () => {
      fs.writeFileSync(path.join(testDir, 'file1.md'), 'content');
      fs.writeFileSync(path.join(testDir, 'file2.md'), 'content');
      fs.writeFileSync(path.join(testDir, 'file3.txt'), 'content');

      const files = listMarkdownFiles(testDir);

      expect(files).toHaveLength(2);
      expect(files).toContain(path.join(testDir, 'file1.md'));
      expect(files).toContain(path.join(testDir, 'file2.md'));
    });

    it('should return empty array for non-existent directory', () => {
      const files = listMarkdownFiles(path.join(testDir, 'missing'));

      expect(files).toEqual([]);
    });

    it('should ignore directories with .md in name', () => {
      fs.mkdirSync(path.join(testDir, 'subdir.md'));
      fs.writeFileSync(path.join(testDir, 'real.md'), 'content');

      const files = listMarkdownFiles(testDir);

      expect(files).toHaveLength(1);
      expect(files[0]).toContain('real.md');
    });

    it('should return empty array for empty directory', () => {
      const emptyDir = path.join(testDir, 'empty');
      fs.mkdirSync(emptyDir);

      const files = listMarkdownFiles(emptyDir);

      expect(files).toEqual([]);
    });
  });

  describe('getFileStats', () => {
    it('should return stats for existing file', () => {
      const filePath = path.join(testDir, 'stats.txt');
      fs.writeFileSync(filePath, 'content');

      const stats = getFileStats(filePath);

      expect(stats).not.toBeNull();
      expect(stats?.isFile()).toBe(true);
    });

    it('should return null for non-existent file', () => {
      const stats = getFileStats(path.join(testDir, 'missing.txt'));

      expect(stats).toBeNull();
    });
  });

  describe('readJsonFile', () => {
    it('should parse JSON file contents', () => {
      const filePath = path.join(testDir, 'data.json');
      fs.writeFileSync(filePath, JSON.stringify({ key: 'value' }));

      const data = readJsonFile<{ key: string }>(filePath);

      expect(data).toEqual({ key: 'value' });
    });

    it('should return null for non-existent file', () => {
      const data = readJsonFile(path.join(testDir, 'missing.json'));

      expect(data).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      const filePath = path.join(testDir, 'invalid.json');
      fs.writeFileSync(filePath, 'not valid json {');

      const data = readJsonFile(filePath);

      expect(data).toBeNull();
    });
  });

  describe('writeJsonFile', () => {
    it('should write JSON to file', () => {
      const filePath = path.join(testDir, 'write.json');

      writeJsonFile(filePath, { foo: 'bar' });

      const content = fs.readFileSync(filePath, 'utf-8');
      expect(JSON.parse(content)).toEqual({ foo: 'bar' });
    });

    it('should format JSON with indentation', () => {
      const filePath = path.join(testDir, 'formatted.json');

      writeJsonFile(filePath, { a: 1, b: 2 });

      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('\n');
    });
  });

  describe('getRelativePath', () => {
    it('should return relative path from base to target', () => {
      const basePath = '/home/user/project';
      const targetPath = '/home/user/project/src/file.ts';

      const result = getRelativePath(basePath, targetPath);

      expect(result).toBe(path.join('src', 'file.ts'));
    });

    it('should handle parent directory traversal', () => {
      const basePath = '/home/user/project/src';
      const targetPath = '/home/user/project/tests/test.ts';

      const result = getRelativePath(basePath, targetPath);

      expect(result).toBe(path.join('..', 'tests', 'test.ts'));
    });
  });

  describe('resolvePath', () => {
    it('should resolve relative path against base', () => {
      const basePath = '/home/user/project';
      const relativePath = 'src/file.ts';

      const result = resolvePath(basePath, relativePath);

      expect(result).toBe('/home/user/project/src/file.ts');
    });

    it('should handle absolute paths', () => {
      const basePath = '/home/user/project';
      const absolutePath = '/etc/config';

      const result = resolvePath(basePath, absolutePath);

      expect(result).toBe('/etc/config');
    });
  });

  describe('getBasename', () => {
    it('should return filename without extension', () => {
      expect(getBasename('/path/to/file.txt')).toBe('file');
      expect(getBasename('/path/to/document.md')).toBe('document');
    });

    it('should handle files without extension', () => {
      expect(getBasename('/path/to/Makefile')).toBe('Makefile');
    });

    it('should handle hidden files', () => {
      expect(getBasename('/path/to/.gitignore')).toBe('.gitignore');
    });
  });

  describe('isInsideDir', () => {
    it('should return true for path inside directory', () => {
      const dirPath = '/home/user/project';
      const targetPath = '/home/user/project/src/file.ts';

      expect(isInsideDir(dirPath, targetPath)).toBe(true);
    });

    it('should return false for path outside directory', () => {
      const dirPath = '/home/user/project';
      const targetPath = '/home/user/other/file.ts';

      expect(isInsideDir(dirPath, targetPath)).toBe(false);
    });

    it('should return true for directory itself', () => {
      const dirPath = '/home/user/project';

      expect(isInsideDir(dirPath, dirPath)).toBe(true);
    });

    it('should return false for absolute path different from base', () => {
      const dirPath = '/home/user/project';
      const targetPath = '/etc/config';

      expect(isInsideDir(dirPath, targetPath)).toBe(false);
    });
  });

  describe('isSymlink', () => {
    it('should return true for symlink', () => {
      const targetFile = path.join(testDir, 'target.txt');
      const symlinkPath = path.join(testDir, 'link.txt');
      fs.writeFileSync(targetFile, 'content');
      fs.symlinkSync(targetFile, symlinkPath);

      expect(isSymlink(symlinkPath)).toBe(true);
    });

    it('should return false for regular file', () => {
      const filePath = path.join(testDir, 'regular.txt');
      fs.writeFileSync(filePath, 'content');

      expect(isSymlink(filePath)).toBe(false);
    });

    it('should return false for directory', () => {
      const dirPath = path.join(testDir, 'subdir');
      fs.mkdirSync(dirPath);

      expect(isSymlink(dirPath)).toBe(false);
    });

    it('should return false for non-existent path', () => {
      expect(isSymlink(path.join(testDir, 'missing'))).toBe(false);
    });
  });

  describe('validateSymlinkTarget', () => {
    it('should return path as-is for regular file', () => {
      const filePath = path.join(testDir, 'regular.txt');
      fs.writeFileSync(filePath, 'content');

      const result = validateSymlinkTarget(filePath, testDir);

      expect(result).toBe(filePath);
    });

    it('should return resolved path for symlink within allowed dir', () => {
      const targetFile = path.join(testDir, 'target.txt');
      const symlinkPath = path.join(testDir, 'link.txt');
      fs.writeFileSync(targetFile, 'content');
      fs.symlinkSync(targetFile, symlinkPath);

      const result = validateSymlinkTarget(symlinkPath, testDir);

      expect(result).toBe(fs.realpathSync(targetFile));
    });

    it('should throw for symlink pointing outside allowed dir', () => {
      // Create a file outside testDir
      const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'outside-'));
      const outsideFile = path.join(outsideDir, 'external.txt');
      fs.writeFileSync(outsideFile, 'external content');

      // Create symlink inside testDir pointing to outside
      const symlinkPath = path.join(testDir, 'evil-link.txt');
      fs.symlinkSync(outsideFile, symlinkPath);

      try {
        expect(() => validateSymlinkTarget(symlinkPath, testDir)).toThrow(
          /Symlink target outside allowed directory/
        );
      } finally {
        fs.rmSync(outsideDir, { recursive: true, force: true });
      }
    });

    it('should handle nested symlinks within allowed dir', () => {
      const subdir = path.join(testDir, 'subdir');
      fs.mkdirSync(subdir);
      const targetFile = path.join(subdir, 'nested.txt');
      fs.writeFileSync(targetFile, 'nested content');

      const symlinkPath = path.join(testDir, 'nested-link.txt');
      fs.symlinkSync(targetFile, symlinkPath);

      const result = validateSymlinkTarget(symlinkPath, testDir);

      expect(result).toBe(fs.realpathSync(targetFile));
    });
  });

  describe('MEMORY_SUBDIRS', () => {
    it('should contain permanent and temporary', () => {
      expect(MEMORY_SUBDIRS).toEqual(['permanent', 'temporary']);
    });
  });

  describe('getAllMemoryIds', () => {
    it('should return empty array for empty directory', () => {
      const ids = getAllMemoryIds(testDir);
      expect(ids).toEqual([]);
    });

    it('should find memories in permanent directory', () => {
      const permanentDir = path.join(testDir, 'permanent');
      fs.mkdirSync(permanentDir);
      fs.writeFileSync(path.join(permanentDir, 'decision-auth.md'), '# Auth');
      fs.writeFileSync(path.join(permanentDir, 'learning-tdd.md'), '# TDD');

      const ids = getAllMemoryIds(testDir);

      expect(ids).toHaveLength(2);
      expect(ids).toContain('decision-auth');
      expect(ids).toContain('learning-tdd');
    });

    it('should find memories in temporary directory', () => {
      const temporaryDir = path.join(testDir, 'temporary');
      fs.mkdirSync(temporaryDir);
      fs.writeFileSync(path.join(temporaryDir, 'thought-123.md'), '# Think');

      const ids = getAllMemoryIds(testDir);

      expect(ids).toHaveLength(1);
      expect(ids).toContain('thought-123');
    });

    it('should combine memories from both directories', () => {
      const permanentDir = path.join(testDir, 'permanent');
      const temporaryDir = path.join(testDir, 'temporary');
      fs.mkdirSync(permanentDir);
      fs.mkdirSync(temporaryDir);
      fs.writeFileSync(path.join(permanentDir, 'decision-api.md'), '# API');
      fs.writeFileSync(path.join(temporaryDir, 'thought-456.md'), '# Thought');

      const ids = getAllMemoryIds(testDir);

      expect(ids).toHaveLength(2);
      expect(ids).toContain('decision-api');
      expect(ids).toContain('thought-456');
    });

    it('should ignore non-markdown files', () => {
      const permanentDir = path.join(testDir, 'permanent');
      fs.mkdirSync(permanentDir);
      fs.writeFileSync(path.join(permanentDir, 'decision-auth.md'), '# Auth');
      fs.writeFileSync(path.join(permanentDir, 'config.json'), '{}');
      fs.writeFileSync(path.join(permanentDir, 'notes.txt'), 'notes');

      const ids = getAllMemoryIds(testDir);

      expect(ids).toHaveLength(1);
      expect(ids).toContain('decision-auth');
    });
  });

  describe('findMemoryFile', () => {
    it('should return null for non-existent memory', () => {
      const result = findMemoryFile(testDir, 'non-existent');
      expect(result).toBeNull();
    });

    it('should find memory in permanent directory', () => {
      const permanentDir = path.join(testDir, 'permanent');
      fs.mkdirSync(permanentDir);
      const filePath = path.join(permanentDir, 'decision-auth.md');
      fs.writeFileSync(filePath, '# Auth');

      const result = findMemoryFile(testDir, 'decision-auth');

      expect(result).toBe(filePath);
    });

    it('should find memory in temporary directory', () => {
      const temporaryDir = path.join(testDir, 'temporary');
      fs.mkdirSync(temporaryDir);
      const filePath = path.join(temporaryDir, 'thought-123.md');
      fs.writeFileSync(filePath, '# Thought');

      const result = findMemoryFile(testDir, 'thought-123');

      expect(result).toBe(filePath);
    });

    it('should prefer permanent over temporary if both exist', () => {
      const permanentDir = path.join(testDir, 'permanent');
      const temporaryDir = path.join(testDir, 'temporary');
      fs.mkdirSync(permanentDir);
      fs.mkdirSync(temporaryDir);
      const permanentFile = path.join(permanentDir, 'learning-dup.md');
      const temporaryFile = path.join(temporaryDir, 'learning-dup.md');
      fs.writeFileSync(permanentFile, '# Permanent');
      fs.writeFileSync(temporaryFile, '# Temporary');

      const result = findMemoryFile(testDir, 'learning-dup');

      expect(result).toBe(permanentFile);
    });
  });
});
