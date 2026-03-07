import { describe, it, expect } from 'vitest';
import { pathExists } from './fs.ts';
import * as os from 'node:os';
import * as path from 'node:path';

describe('pathExists', () => {
  it('should return true for an existing directory', async () => {
    expect(await pathExists(os.tmpdir())).toBe(true);
  });

  it('should return true for an existing file', async () => {
    // tsconfig.json lives at the repo root, not in hooks/
    const repoRoot = path.resolve(__dirname, '..', '..', '..');
    expect(await pathExists(path.join(repoRoot, 'tsconfig.json'))).toBe(true);
  });

  it('should return false for a non-existent path', async () => {
    expect(await pathExists('/tmp/definitely-does-not-exist-' + Date.now())).toBe(false);
  });
});
