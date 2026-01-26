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
import { existsSync, statSync } from 'fs';
import { join, dirname, isAbsolute, normalize } from 'path';
import { fileURLToPath } from 'url';

function isBunInstalled() {
  try {
    execFileSync('which', ['bun'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate that a path is safe to use as plugin root
 * - Must be absolute
 * - Must exist as a directory
 * - Must not contain path traversal attempts
 */
function isValidPluginRoot(path) {
  if (!path || typeof path !== 'string') return false;

  // Normalize and check for path traversal
  const normalized = normalize(path);
  if (normalized.includes('..')) return false;

  // Must be absolute
  if (!isAbsolute(normalized)) return false;

  // Must exist and be a directory
  try {
    const stats = statSync(normalized);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

function getPluginRoot() {
  // Try env var first (set by Claude Code when running plugin hooks)
  if (process.env.CLAUDE_PLUGIN_ROOT) {
    const envPath = process.env.CLAUDE_PLUGIN_ROOT;
    if (isValidPluginRoot(envPath)) {
      return envPath;
    }
    // Invalid env var - fall back to script location
    console.log(`⚠️ Invalid CLAUDE_PLUGIN_ROOT: ${envPath}`);
  }

  // Fall back to relative path from this script's location
  // This script is in hooks/session-start/, plugin root is ../..
  const scriptPath = fileURLToPath(import.meta.url);
  const fallbackPath = join(dirname(scriptPath), '..', '..');

  if (isValidPluginRoot(fallbackPath)) {
    return fallbackPath;
  }

  return null;
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

// Step 2: Get and validate plugin root
const pluginRoot = getPluginRoot();
if (!pluginRoot) {
  console.log(`⚠️ Could not determine plugin root directory`);
  process.exit(0);
}

// Step 3: Check if node_modules exists (marketplace installs don't have them)
const nodeModulesPath = join(pluginRoot, 'node_modules');
const packageJsonPath = join(pluginRoot, 'package.json');

if (!existsSync(nodeModulesPath)) {
  // Verify package.json exists before attempting install
  if (!existsSync(packageJsonPath)) {
    console.log(`⚠️ No package.json found at ${pluginRoot} - cannot install dependencies`);
    process.exit(0);
  }

  console.log(`📦 Installing plugin dependencies...`);
  try {
    execFileSync('bun', ['install'], {
      cwd: pluginRoot,
      stdio: 'inherit',
      timeout: 30000,
    });
    console.log(`✅ Dependencies installed successfully.`);
  } catch (e) {
    // Provide specific error messages based on error type
    const errorCode = e.code || 'UNKNOWN';
    let hint = '';

    if (errorCode === 'ETIMEDOUT' || e.killed) {
      hint = 'Installation timed out - check network connection';
    } else if (errorCode === 'EACCES' || errorCode === 'EPERM') {
      hint = 'Permission denied - check directory permissions';
    } else if (errorCode === 'ENOENT') {
      hint = 'Bun executable not found in PATH';
    }

    console.log(`⚠️ Failed to install dependencies (${errorCode})${hint ? ': ' + hint : ''}

You may need to manually run: cd ${pluginRoot} && bun install`);
    // Don't block session, but warn
    process.exit(0);
  }
}

process.exit(0);
