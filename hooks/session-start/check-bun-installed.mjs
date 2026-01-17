#!/usr/bin/env node
/**
 * check-bun-installed.mjs - Verify Bun is installed
 *
 * Simple Node.js hook that checks if Bun is available.
 * Shows installation instructions if missing.
 * Runs with Node.js (guaranteed by Claude Code) so it works even when Bun isn't installed.
 */
import { execFileSync } from 'child_process';

function isBunInstalled() {
  try {
    execFileSync('which', ['bun'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!isBunInstalled()) {
  // Exit 0 with stdout - only way to make message visible in Claude Code
  // (exit 2 + stderr doesn't display message content despite docs)
  console.log(`🚨 BUN NOT INSTALLED - Memory plugin requires Bun

Install: curl -fsSL https://bun.sh/install | bash
Docs: https://bun.sh/docs/installation

Then restart Claude Code. Other hook errors below are expected until Bun is installed.`);
  process.exit(0);
}

process.exit(0);
