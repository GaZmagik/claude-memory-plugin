import { describe, it, expect } from 'vitest';
import { pathExists } from './fs.ts';
import * as os from 'node:os';
import * as path from 'node:path';

describe('pathExists', () => {
  it('should return true for an existing directory', async () => {
    expect(await pathExists(os.tmpdir())).toBe(true);
  });

  it('should return true for an existing file', async () => {
    expect(await pathExists(path.resolve('tsconfig.json'))).toBe(true);
  });

  it('should return false for a non-existent path', async () => {
    expect(await pathExists('/tmp/definitely-does-not-exist-' + Date.now())).toBe(false);
  });
});
