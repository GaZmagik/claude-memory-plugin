#!/usr/bin/env node
/**
 * check-bun-installed.mjs - Verify Bun is installed and dependencies are available
 *
 * Simple Node.js hook that:
 * 1. Checks if Bun is available (shows installation instructions if missing)
 * 2. Checks if node_modules exists (runs bun install if missing)
 *
 * Runs with Node.js (guaranteed by Claude Code) so it works even when Bun isn't installed
 * or when dependencies haven't been installed yet (marketplace install scenario).
 */
import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

function isBunInstalled() {
  try {
    execFileSync('which', ['bun'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function getPluginRoot() {
  // Try env var first (set by Claude Code when running plugin hooks)
  if (process.env.CLAUDE_PLUGIN_ROOT) {
    return process.env.CLAUDE_PLUGIN_ROOT;
  }

  // Fall back to relative path from this script's location
  // This script is in hooks/session-start/, plugin root is ../..
  const scriptPath = fileURLToPath(import.meta.url);
  return join(dirname(scriptPath), '..', '..');
}

// Step 1: Check if Bun is installed
if (!isBunInstalled()) {
  // Exit 0 with stdout - only way to make message visible in Claude Code
  // (exit 2 + stderr doesn't display message content despite docs)
  console.log(`🚨 BUN NOT INSTALLED - Memory plugin requires Bun

Install: curl -fsSL https://bun.sh/install | bash
Docs: https://bun.sh/docs/installation

Then restart Claude Code. Other hook errors below are expected until Bun is installed.`);
  process.exit(0);
}

// Step 2: Check if node_modules exists (marketplace installs don't have them)
const pluginRoot = getPluginRoot();
const nodeModulesPath = join(pluginRoot, 'node_modules');

if (!existsSync(nodeModulesPath)) {
  console.log(`📦 Installing plugin dependencies...`);
  try {
    execFileSync('bun', ['install'], {
      cwd: pluginRoot,
      stdio: 'inherit',
      timeout: 30000,
    });
    console.log(`✅ Dependencies installed successfully.`);
  } catch (e) {
    console.log(`⚠️ Failed to install dependencies: ${e.message}

You may need to manually run: cd ${pluginRoot} && bun install`);
    // Don't block session, but warn
    process.exit(0);
  }
}

process.exit(0);
