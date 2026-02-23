/**
 * SubagentRegistry
 *
 * Manages per-subagent temp files so concurrent agents don't stomp on each
 * other. Each subagent gets its own isolated file; the first consumer
 * (PostToolUse or SessionEnd) atomically claims it via rename().
 *
 * File naming:
 *   Unclaimed: /tmp/.claude-memory-plugin-subagent-{agentType}-{agentId}
 *   Claimed:   /tmp/.claude-memory-plugin-claimed-{agentType}-{agentId}
 */

import { writeFileSync, readdirSync, renameSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export const SUBAGENT_TEMP_PREFIX = join(tmpdir(), '.claude-memory-plugin-subagent-');
export const SUBAGENT_CLAIMED_PREFIX = join(tmpdir(), '.claude-memory-plugin-claimed-');

export interface SubagentEntry {
  agentId: string;
  agentType: string;
  sessionId: string;
  timestamp: string;
}

/** Strip characters that could cause path traversal or filesystem issues. */
function sanitise(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Returns the full path for an unclaimed subagent temp file.
 */
export function buildSubagentTempPath(agentType: string, agentId: string): string {
  return `${SUBAGENT_TEMP_PREFIX}${sanitise(agentType)}-${sanitise(agentId)}`;
}

/**
 * Writes a subagent entry to its unique temp file.
 * Called by the SubagentStop hook after each subagent completes.
 */
export function writeSubagentEntry(
  agentId: string,
  agentType: string,
  sessionId: string
): void {
  const entry: SubagentEntry = {
    agentId,
    agentType,
    sessionId,
    timestamp: new Date().toISOString(),
  };
  writeFileSync(buildSubagentTempPath(agentType, agentId), JSON.stringify(entry));
}

/**
 * Finds the first unclaimed entry for the given agentType, atomically claims
 * it (rename → claimed-*), and returns the parsed entry.
 *
 * Returns null if no unclaimed entry exists for that agentType.
 *
 * Concurrent-safe: rename() on Linux is atomic. If two processes race,
 * only one succeeds; the other gets ENOENT and tries the next file.
 */
export function findAndClaimSubagent(agentType: string): SubagentEntry | null {
  const filePrefix = `.claude-memory-plugin-subagent-${sanitise(agentType)}-`;
  try {
    const candidates = readdirSync(tmpdir()).filter((f) => f.startsWith(filePrefix));
    for (const file of candidates) {
      const filePath = join(tmpdir(), file);
      const claimedFile = file.replace(
        '.claude-memory-plugin-subagent-',
        '.claude-memory-plugin-claimed-'
      );
      const claimedPath = join(tmpdir(), claimedFile);
      try {
        const content = readFileSync(filePath, 'utf-8');
        const entry: SubagentEntry = JSON.parse(content);
        renameSync(filePath, claimedPath); // atomic — throws ENOENT if already claimed
        return entry;
      } catch {
        // Another process claimed this file first, or it was malformed — try next
        continue;
      }
    }
  } catch {
    // tmpdir read failure — non-fatal
  }
  return null;
}

/**
 * Finds and atomically claims the first unclaimed subagent entry of ANY type.
 * Used by PostToolUse:Task where agentType is not available from SubagentStop.
 *
 * Concurrent-safe via rename() — see findAndClaimSubagent for details.
 */
export function findAnyUnclaimedSubagent(): SubagentEntry | null {
  const filePrefix = '.claude-memory-plugin-subagent-';
  try {
    const candidates = readdirSync(tmpdir()).filter((f) => f.startsWith(filePrefix));
    for (const file of candidates) {
      const filePath = join(tmpdir(), file);
      const claimedFile = file.replace(
        '.claude-memory-plugin-subagent-',
        '.claude-memory-plugin-claimed-'
      );
      const claimedPath = join(tmpdir(), claimedFile);
      try {
        const content = readFileSync(filePath, 'utf-8');
        const entry: SubagentEntry = JSON.parse(content);
        renameSync(filePath, claimedPath);
        return entry;
      } catch {
        continue;
      }
    }
  } catch {
    // tmpdir read failure — non-fatal
  }
  return null;
}

/**
 * Returns all unclaimed subagent entries (any agent type).
 * Read-only — does not claim. Used by SessionEnd to sweep remaining entries.
 * Skips malformed files silently.
 */
export function listUnclaimedSubagents(): SubagentEntry[] {
  const filePrefix = '.claude-memory-plugin-subagent-';
  const entries: SubagentEntry[] = [];
  try {
    const files = readdirSync(tmpdir()).filter((f) => f.startsWith(filePrefix));
    for (const file of files) {
      try {
        const content = readFileSync(join(tmpdir(), file), 'utf-8');
        const entry: SubagentEntry = JSON.parse(content);
        entries.push(entry);
      } catch {
        // Malformed or concurrently removed — skip
      }
    }
  } catch {
    // tmpdir read failure — non-fatal
  }
  return entries;
}
