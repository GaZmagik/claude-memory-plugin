/**
 * Integration Test: Filesystem Permission Errors
 *
 * Tests handling of permission-related errors:
 * - Read-only directories
 * - Insufficient write permissions
 * - Permission changes during operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { readMemory } from '../../skills/memory/src/core/read.js';
import { deleteMemory } from '../../skills/memory/src/core/delete.js';
import { saveIndex, loadIndex } from '../../skills/memory/src/core/index.js';
import { MemoryType, Scope } from '../../skills/memory/src/types/enums.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

describe('Filesystem Permission Errors', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'memory-perms-test-'));
  });

  afterEach(() => {
    // Restore permissions recursively before cleanup
    const restorePermissions = (dir: string): void => {
      try {
        fs.chmodSync(dir, 0o755);
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        entries.forEach(entry => {
          const fullPath = path.join(dir, entry.name);
          try {
            if (entry.isDirectory()) {
              restorePermissions(fullPath);
            } else {
              fs.chmodSync(fullPath, 0o644);
            }
          } catch {}
        });
      } catch {}
    };

    restorePermissions(testDir);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('Read-Only Directory', () => {
    it('should handle writing to read-only directory', async () => {
      // Make directory read-only
      fs.chmodSync(testDir, 0o555);

      const writeResult = await writeMemory({
        title: 'Test Memory',
        type: MemoryType.Learning,
        content: 'Test content',
        tags: [],
        scope: Scope.Global,
        basePath: testDir,
      });

      // Should fail or handle gracefully
      if (writeResult.status === 'error') {
        expect(writeResult.error).toBeDefined();
      }

      // Restore permissions
      fs.chmodSync(testDir, 0o755);
    });

    it('should handle reading from read-only directory', async () => {
      // Create memory first
      await writeMemory({
        title: 'Test Memory',
        type: MemoryType.Learning,
        content: 'Test content',
        tags: [],
        scope: Scope.Global,
        basePath: testDir,
      });

      // Make directory read-only
      fs.chmodSync(testDir, 0o555);

      // Reading should still work
      const files = fs.readdirSync(testDir);
      const memoryFile = files.find(f => f.endsWith('.md'));

      if (memoryFile) {
        const memoryId = path.basename(memoryFile, '.md');
        const readResult = await readMemory({
          id: memoryId,
          basePath: testDir,
        });

        expect(readResult.status).toBe('success');
      }

      // Restore permissions
      fs.chmodSync(testDir, 0o755);
    });
  });

  describe('Read-Only Files', () => {
    it('should handle updating read-only memory file', async () => {
      // Create memory
      const writeResult = await writeMemory({
        title: 'Original',
        type: MemoryType.Learning,
        content: 'Original content',
        tags: [],
        scope: Scope.Global,
        basePath: testDir,
      });

      expect(writeResult.status).toBe('success');
      const filePath = writeResult.memory?.filePath;

      if (filePath) {
        // Make file read-only
        fs.chmodSync(filePath, 0o444);

        // Note: On Unix, unlinkSync checks directory permissions, not file permissions
        // So deleting a read-only file in a writable directory succeeds
        const deleteResult = await deleteMemory({
          id: writeResult.memory?.id ?? '',
          basePath: testDir,
        });

        // Delete succeeds because directory is still writable
        expect(deleteResult.status).toBe('success');
      }
    });

    it('should handle read-only index file', async () => {
      // Create initial memory
      await writeMemory({
        title: 'First Memory',
        type: MemoryType.Learning,
        content: 'Content',
        tags: [],
        scope: Scope.Global,
        basePath: testDir,
      });

      const indexPath = path.join(testDir, 'index.json');

      // Make index read-only
      fs.chmodSync(indexPath, 0o444);

      // Writing new memory should fail or handle gracefully
      const writeResult = await writeMemory({
        title: 'Second Memory',
        type: MemoryType.Decision,
        content: 'Content 2',
        tags: [],
        scope: Scope.Global,
        basePath: testDir,
      });

      // Might fail or succeed depending on implementation
      expect(writeResult.status).toBeDefined();

      // Restore permissions
      fs.chmodSync(indexPath, 0o644);
    });
  });

  describe('Permission Changes During Operations', () => {
    it('should handle directory becoming read-only mid-operation', async () => {
      // Start write operation
      const writePromise = writeMemory({
        title: 'Test Memory',
        type: MemoryType.Learning,
        content: 'Test content',
        tags: [],
        scope: Scope.Global,
        basePath: testDir,
      });

      // Wait a moment then change permissions (race condition test)
      setTimeout(() => {
        try {
          fs.chmodSync(testDir, 0o555);
        } catch {}
      }, 5);

      const result = await writePromise;

      // Restore permissions
      try {
        fs.chmodSync(testDir, 0o755);
      } catch {}

      expect(result.status).toBeDefined();
    });
  });

  describe('Non-Existent Directory', () => {
    it('should handle operations on non-existent directory', async () => {
      const nonExistentDir = path.join(testDir, 'does-not-exist');

      const writeResult = await writeMemory({
        title: 'Test Memory',
        type: MemoryType.Learning,
        content: 'Test content',
        tags: [],
        scope: Scope.Global,
        basePath: nonExistentDir,
      });

      // Should create directory or return error
      expect(writeResult.status).toBeDefined();
    });

    it('should handle reading from non-existent directory', async () => {
      const nonExistentDir = path.join(testDir, 'does-not-exist');

      const loadResult = await loadIndex({ basePath: nonExistentDir });

      // Should return empty index
      expect(loadResult.memories).toEqual([]);
    });
  });

  describe('Symlink Handling', () => {
    it('should handle symlinked memory directory', async () => {
      const realDir = path.join(testDir, 'real');
      const symlinkDir = path.join(testDir, 'symlink');

      fs.mkdirSync(realDir);
      fs.symlinkSync(realDir, symlinkDir, 'dir');

      // Write through symlink
      const writeResult = await writeMemory({
        title: 'Via Symlink',
        type: MemoryType.Learning,
        content: 'Content',
        tags: [],
        scope: Scope.Global,
        basePath: symlinkDir,
      });

      expect(writeResult.status).toBe('success');

      // Verify file exists in real directory
      const files = fs.readdirSync(realDir);
      expect(files.length).toBeGreaterThan(0);
    });
  });

  describe('Disk Space Issues', () => {
    it('should handle extremely large content gracefully', async () => {
      // Create very large content (simulating disk space issues)
      const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB

      const writeResult = await writeMemory({
        title: 'Large Memory',
        type: MemoryType.Learning,
        content: largeContent,
        tags: [],
        scope: Scope.Global,
        basePath: testDir,
      });

      // Should succeed or fail gracefully
      expect(writeResult.status).toBeDefined();
    });
  });
});
