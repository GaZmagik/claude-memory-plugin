#!/usr/bin/env bun
/**
 * Postinstall script: Create direct symlink to memory CLI
 *
 * This runs after `bun install` and creates a symlink from
 * ~/.bun/bin/memory to the CLI script in the installed plugin.
 *
 * When a new version is installed, this overwrites the old symlink
 * to point to the new version automatically.
 */

import { mkdirSync, symlinkSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const bunBin = join(homedir(), '.bun', 'bin');
// Use import.meta.dir to get this script's location, not cwd
// This works regardless of where the script is invoked from
const scriptDir = import.meta.dir;
const cliPath = join(scriptDir, 'cli.ts');
const linkPath = join(bunBin, 'memory');

// Ensure bun bin directory exists
mkdirSync(bunBin, { recursive: true });

// Remove existing symlink if present (ln -sf equivalent)
if (existsSync(linkPath)) {
  unlinkSync(linkPath);
}

// Create symlink
symlinkSync(cliPath, linkPath);

console.log(`memory CLI linked: ${linkPath} -> ${cliPath}`);
