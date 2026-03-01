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

import { writeFileSync, readdirSync, renameSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export const SUBAGENT_TEMP_PREFIX = join(tmpdir(), '.claude-memory-plugin-subagent-');
export const SUBAGENT_CLAIMED_PREFIX = join(tmpdir(), '.claude-memory-plugin-claimed-');

export interface SubagentEntry {
  agentId: string;
  agentType: string;
  sessionId: string;
  timestamp: string;
}

/**
 * Strip characters that could cause path traversal or filesystem issues,
 * and cap length to prevent ENAMETOOLONG on filesystems with NAME_MAX=255.
 */
function sanitise(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

/**
 * Returns the full path for an unclaimed subagent temp file.
 */
export function buildSubagentTempPath(agentType: string, agentId: string): string {
  return `${SUBAGENT_TEMP_PREFIX}${sanitise(agentType)}-${sanitise(agentId)}`;
}

/**
 * Returns the full path for a claimed subagent temp file.
 */
export function buildClaimedPath(agentType: string, agentId: string): string {
  return `${SUBAGENT_CLAIMED_PREFIX}${sanitise(agentType)}-${sanitise(agentId)}`;
}

/**
 * Writes a subagent entry to its unique temp file.
 * Called by the SubagentStop hook after each subagent completes.
 * Non-fatal: errors are swallowed to avoid disrupting the hook pipeline.
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
  try {
    writeFileSync(buildSubagentTempPath(agentType, agentId), JSON.stringify(entry));
  } catch {
    // Non-fatal: disk-full, permission error, or bad tmpdir path. Swallow silently.
  }
}

/**
 * Removes the claimed marker file for a processed subagent entry.
 * Call this after successfully consuming a claimed entry to prevent /tmp accumulation.
 * Non-fatal: errors are swallowed if the file was already removed or never created.
 */
export function cleanupClaimedEntry(agentType: string, agentId: string): void {
  try {
    unlinkSync(buildClaimedPath(agentType, agentId));
  } catch {
    // Non-fatal: file may already be removed or never created.
  }
}

/**
 * Attempts to claim the first matching file from the given candidate list.
 *
 * The read-then-rename pattern is intentionally optimistic: we read the file
 * content first, then atomically rename it to the claimed path. This is NOT
 * strictly atomic as a pair — two processes can both readFileSync successfully
 * before either calls renameSync. However, the rename itself IS POSIX-atomic
 * on Linux: only one process succeeds; the other gets ENOENT and moves on to
 * the next candidate. If a stale claimed file from a previous crash already
 * exists at claimedPath, renameSync silently overwrites it — acceptable, since
 * the old claimed entry was already abandoned and would never be consumed.
 */
function claimFirstCandidate(candidates: string[]): SubagentEntry | null {
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
      // Another process claimed this file first, or it was malformed — try next
      continue;
    }
  }
  return null;
}

/**
 * Finds the first unclaimed entry for the given agentType, atomically claims
 * it (rename → claimed-*), and returns the parsed entry.
 *
 * Returns null if no unclaimed entry exists for that agentType.
 *
 * Concurrent-safe: see claimFirstCandidate for the full atomicity discussion.
 */
export function findAndClaimSubagent(agentType: string): SubagentEntry | null {
  const filePrefix = `.claude-memory-plugin-subagent-${sanitise(agentType)}-`;
  try {
    const candidates = readdirSync(tmpdir()).filter((f) => f.startsWith(filePrefix));
    return claimFirstCandidate(candidates);
  } catch {
    // tmpdir read failure — non-fatal
  }
  return null;
}

/**
 * Finds and atomically claims the first unclaimed subagent entry of ANY type.
 * Used by PostToolUse:Task where agentType is not available from SubagentStop.
 *
 * Concurrent-safe: see claimFirstCandidate for the full atomicity discussion.
 */
export function findAnyUnclaimedSubagent(): SubagentEntry | null {
  const filePrefix = '.claude-memory-plugin-subagent-';
  try {
    const candidates = readdirSync(tmpdir()).filter((f) => f.startsWith(filePrefix));
    return claimFirstCandidate(candidates);
  } catch {
    // tmpdir read failure — non-fatal
  }
  return null;
}
