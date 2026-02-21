/**
 * External File Discovery
 *
 * Discovers external Claude CLI files (CLAUDE.md, rules/*.md, agent MEMORY.md)
 * for indexing as read-only graph nodes.
 */

import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { ExternalFileKind, type ExternalFileEntry } from './external-file-types.js';
import { Scope } from '../types/enums.js';
import { sanitiseAgentName } from '../scope/sanitise-agent-name.js';

/**
 * Maximum external file size (1MB) per FR-024
 * Files larger than this will be skipped with a warning to prevent event loop blocking
 */
const MAX_EXTERNAL_FILE_SIZE = 1_048_576; // 1MB

/**
 * Vendor directories to exclude from discovery
 */
const VENDOR_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'vendor', '.next', '.venv', '__pycache__']);

/**
 * Calculate content hash (SHA-256 first 16 chars) for cache invalidation
 * Returns null if file exceeds size limit (FR-024)
 */
async function calculateContentHash(filePath: string): Promise<string | null> {
  try {
    // FR-024: Check file size before reading to prevent event loop blocking
    const stats = await fsp.stat(filePath);
    if (stats.size > MAX_EXTERNAL_FILE_SIZE) {
      console.warn(
        `Skipping large external file (${stats.size} bytes, limit ${MAX_EXTERNAL_FILE_SIZE}): ${filePath}`
      );
      return null;
    }

    const content = await fsp.readFile(filePath, 'utf-8');
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return hash.substring(0, 16);
  } catch {
    return '0000000000000000'; // Fallback for unreadable files
  }
}

/**
 * Get file modification time as ISO 8601 string
 */
async function getModifiedTime(filePath: string): Promise<string> {
  try {
    const stats = await fsp.stat(filePath);
    return stats.mtime.toISOString();
  } catch {
    return new Date().toISOString(); // Fallback
  }
}

/**
 * Check if path is within a vendor directory
 */
function isVendorPath(filePath: string): boolean {
  const parts = filePath.split(path.sep);
  return parts.some(part => VENDOR_DIRS.has(part));
}

/**
 * Resolve symlink to canonical path, handling errors gracefully
 */
async function resolveSymlink(filePath: string, visited: Set<string>): Promise<string | null> {
  try {
    const realPath = await fsp.realpath(filePath);

    // Detect symlink loops
    if (visited.has(realPath)) {
      return null;
    }

    return realPath;
  } catch {
    // Broken symlink or permission error
    return null;
  }
}

/**
 * Generate deterministic ID for rule file
 */
function generateRuleId(
  absolutePath: string,
  kind: ExternalFileKind,
  scope: Scope,
  cwd?: string,
  homeDir?: string
): string {
  const filename = path.basename(absolutePath); // Keep .md extension
  const dirname = path.dirname(absolutePath);

  // Base scope prefix
  let scopePrefix = scope === Scope.Global ? 'global' :
                    scope === Scope.Local ? 'local' :
                    'project';

  // Handle ancestor files
  if (cwd && homeDir && scope === Scope.Project) {
    const ancestorLevel = getAncestorLevel(dirname, cwd, homeDir);
    if (ancestorLevel > 0) {
      scopePrefix = `ancestor-${ancestorLevel}`;
    }
  }

  // Handle same-level disambiguation
  let suffix = '';
  if (kind === ExternalFileKind.ClaudeInstructions || kind === ExternalFileKind.ClaudeLocalInstructions) {
    if (dirname.endsWith('.claude')) {
      suffix = kind === ExternalFileKind.ClaudeLocalInstructions ? '-dotclaude-local' : '-dotclaude';
    } else {
      suffix = '-root';
    }
  } else if (kind === ExternalFileKind.RulesFile) {
    // Extract filename without extension for rules files
    const name = path.basename(absolutePath, '.md').toLowerCase().replace(/[_\s]/g, '-');
    return `rule-${scopePrefix}-${name}`;
  }

  // Convert filename to ID format (lowercase, replace dots/spaces/underscores with hyphens)
  const baseName = filename.toLowerCase().replace(/\.md$/, '-md').replace(/[_\s.]/g, '-');
  return `rule-${scopePrefix}-${baseName}${suffix}`;
}

/**
 * Get ancestor level (how many directories up from cwd)
 */
function getAncestorLevel(dirPath: string, cwd: string, homeDir: string): number {
  let level = 0;
  let current = cwd;

  while (current !== homeDir && current !== path.dirname(current)) {
    current = path.dirname(current);
    level++;
    if (current === dirPath) {
      return level;
    }
  }

  return 0;
}

/**
 * Generate deterministic ID for reminder file
 */
function generateReminderId(
  absolutePath: string,
  kind: ExternalFileKind,
  scope: Scope,
  agentName: string
): string {
  const filename = path.basename(absolutePath, '.md');
  const scopePrefix = scope === Scope.AgentGlobal ? 'global' :
                      scope === Scope.Local ? 'local' :
                      'project';

  if (kind === ExternalFileKind.AgentMemorySummary) {
    return `reminder-${scopePrefix}-${agentName}-memory`;
  } else {
    const name = filename.toLowerCase().replace(/[_\s]/g, '-');
    return `reminder-${scopePrefix}-${agentName}-${name}`;
  }
}

/**
 * Determine scope for rule file
 */
function determineRuleScope(
  absolutePath: string,
  kind: ExternalFileKind,
  gitRoot?: string,
  homeDir?: string
): Scope {
  const normalized = path.normalize(absolutePath);
  const home = homeDir || os.homedir();

  // CLAUDE.local.md is always local scope
  if (kind === ExternalFileKind.ClaudeLocalInstructions) {
    return Scope.Local;
  }

  // Check git root first (more specific than home)
  if (gitRoot && normalized.startsWith(gitRoot) && gitRoot !== home) {
    return Scope.Project;
  }

  // If gitRoot is explicitly provided (even if equals home), prefer project scope
  if (gitRoot && normalized.startsWith(gitRoot)) {
    return Scope.Project;
  }

  // Files in home directory are global
  if (normalized.startsWith(path.join(home, '.claude'))) {
    return Scope.Global;
  }

  // Default to project
  return Scope.Project;
}

/**
 * Determine scope for reminder file
 */
function determineReminderScope(
  absolutePath: string,
  projectRoot?: string,
  homeDir?: string
): Scope {
  const normalized = path.normalize(absolutePath);
  const home = homeDir || os.homedir();

  // Files in .claude/agent-memory-local/ are local scope (check first)
  if (normalized.includes(path.join('.claude', 'agent-memory-local'))) {
    return Scope.Local;
  }

  // If projectRoot is explicitly provided, check it first
  if (projectRoot && normalized.startsWith(path.join(projectRoot, '.claude', 'agent-memory')) && !normalized.startsWith(path.join(projectRoot, '.claude', 'agent-memory-local'))) {
    return Scope.AgentProject;
  }

  // Files in home directory are agent-global
  if (normalized.startsWith(path.join(home, '.claude', 'agent-memory'))) {
    return Scope.AgentGlobal;
  }

  // Default to agent-project
  return Scope.AgentProject;
}

/**
 * Discover all rule files (CLAUDE.md, CLAUDE.local.md, rules/*.md) in known paths
 */
export async function discoverRuleFiles(options?: {
  cwd?: string;
  homeDir?: string;
  gitRoot?: string;
}): Promise<ExternalFileEntry[]> {
  const cwd = options?.cwd || process.cwd();
  const homeDir = options?.homeDir || os.homedir();
  const gitRoot = options?.gitRoot;

  const results: ExternalFileEntry[] = [];
  const visited = new Set<string>();

  // Helper to add file if valid
  const addFile = async (filePath: string, kind: ExternalFileKind) => {
    try {
      await fsp.access(filePath);
    } catch {
      return;
    }
    if (isVendorPath(filePath)) return;

    // Resolve symlinks
    const realPath = await resolveSymlink(filePath, visited);
    if (!realPath) return;

    if (visited.has(realPath)) return;
    visited.add(realPath);

    try {
      const stats = await fsp.stat(realPath);
      if (!stats.isFile()) return;

      const scope = determineRuleScope(realPath, kind, gitRoot, homeDir);
      const id = generateRuleId(realPath, kind, scope, cwd, homeDir);
      const title = path.basename(realPath);
      const contentHash = await calculateContentHash(realPath);

      // Skip if file exceeds size limit (FR-024)
      if (contentHash === null) return;

      const modifiedTime = await getModifiedTime(realPath);

      results.push({
        absolutePath: realPath,
        kind,
        scope,
        contentHash,
        id,
        title,
        modifiedTime,
      });
    } catch {
      // Skip files that can't be read
    }
  };

  // 1. Walk up from cwd to homeDir looking for CLAUDE.md and CLAUDE.local.md
  let current = cwd;
  do {
    // Check for CLAUDE.md in current directory
    await addFile(path.join(current, 'CLAUDE.md'), ExternalFileKind.ClaudeInstructions);

    // Check for CLAUDE.local.md in current directory
    await addFile(path.join(current, 'CLAUDE.local.md'), ExternalFileKind.ClaudeLocalInstructions);

    // Check for .claude/CLAUDE.md
    await addFile(path.join(current, '.claude', 'CLAUDE.md'), ExternalFileKind.ClaudeInstructions);

    // Check for .claude/CLAUDE.local.md
    await addFile(path.join(current, '.claude', 'CLAUDE.local.md'), ExternalFileKind.ClaudeLocalInstructions);

    // Stop if we've reached homeDir or root
    if (current === homeDir || current === path.dirname(current)) {
      break;
    }

    current = path.dirname(current);
  } while (true);

  // 2. Check home directory
  await addFile(path.join(homeDir, '.claude', 'CLAUDE.md'), ExternalFileKind.ClaudeInstructions);
  await addFile(path.join(homeDir, '.claude', 'CLAUDE.local.md'), ExternalFileKind.ClaudeLocalInstructions);

  // 3. Scan rules directories
  const scanRulesDir = async (rulesDir: string) => {
    try {
      await fsp.access(rulesDir);
    } catch {
      return;
    }

    try {
      const entries = await fsp.readdir(rulesDir);
      for (const entry of entries.sort()) {
        if (entry.endsWith('.md')) {
          await addFile(path.join(rulesDir, entry), ExternalFileKind.RulesFile);
        }
      }
    } catch {
      // Skip directories that can't be read
    }
  };

  // Project rules directory
  if (gitRoot) {
    await scanRulesDir(path.join(gitRoot, '.claude', 'rules'));
  } else {
    await scanRulesDir(path.join(cwd, '.claude', 'rules'));
  }

  // Global rules directory
  await scanRulesDir(path.join(homeDir, '.claude', 'rules'));

  return results;
}

/**
 * Discover all reminder files (MEMORY.md and sub-files) in agent-memory directories
 */
export async function discoverReminderFiles(options?: {
  projectRoot?: string;
  homeDir?: string;
}): Promise<ExternalFileEntry[]> {
  const projectRoot = options?.projectRoot || process.cwd();
  const homeDir = options?.homeDir || os.homedir();

  const results: ExternalFileEntry[] = [];
  const visited = new Set<string>();

  // Helper to scan agent directory
  const scanAgentDir = async (agentMemoryBase: string) => {
    try {
      await fsp.access(agentMemoryBase);
    } catch {
      return;
    }

    try {
      const agentDirs = (await fsp.readdir(agentMemoryBase)).sort();

      for (const rawAgentName of agentDirs) {
        // Sanitise agent name to prevent injection and ensure valid IDs
        const agentName = sanitiseAgentName(rawAgentName);
        if (!agentName) continue; // Skip if sanitisation resulted in empty string

        const agentDir = path.join(agentMemoryBase, rawAgentName);

        try {
          const stats = await fsp.stat(agentDir);
          if (!stats.isDirectory()) continue;

          // Scan all .md files in agent directory
          const files = (await fsp.readdir(agentDir)).sort();

          for (const file of files) {
            if (!file.endsWith('.md')) continue;

            const filePath = path.join(agentDir, file);

            // Resolve symlinks
            const realPath = await resolveSymlink(filePath, visited);
            if (!realPath) continue;

            if (visited.has(realPath)) continue;
            visited.add(realPath);

            try {
              const fileStats = await fsp.stat(realPath);
              if (!fileStats.isFile()) continue;

              const isMemoryMd = file === 'MEMORY.md';
              const kind = isMemoryMd
                ? ExternalFileKind.AgentMemorySummary
                : ExternalFileKind.AgentMemorySubFile;

              const scope = determineReminderScope(realPath, projectRoot, homeDir);
              const id = generateReminderId(realPath, kind, scope, agentName);
              const title = isMemoryMd ? `${agentName} Agent Memory` : file;
              const contentHash = await calculateContentHash(realPath);

              // Skip if file exceeds size limit (FR-024)
              if (contentHash === null) continue;

              const modifiedTime = await getModifiedTime(realPath);

              results.push({
                absolutePath: realPath,
                kind,
                scope,
                agentName,
                contentHash: contentHash as string, // Safe: null case handled above
                id,
                title,
                modifiedTime,
              });
            } catch {
              // Skip files that can't be read
            }
          }
        } catch {
          // Skip directories that can't be read
        }
      }
    } catch {
      // Skip if agent-memory directory doesn't exist or can't be read
    }
  };

  // Scan project agent-memory directories
  await scanAgentDir(path.join(projectRoot, '.claude', 'agent-memory'));
  await scanAgentDir(path.join(projectRoot, '.claude', 'agent-memory-local'));

  // Scan global agent-memory directory
  await scanAgentDir(path.join(homeDir, '.claude', 'agent-memory'));

  return results;
}

/**
 * Discover all external files (rules + reminders) in one operation
 */
export async function discoverExternalFiles(options?: {
  cwd?: string;
  homeDir?: string;
  gitRoot?: string;
  projectRoot?: string;
}): Promise<ExternalFileEntry[]> {
  const rules = await discoverRuleFiles({
    cwd: options?.cwd,
    homeDir: options?.homeDir,
    gitRoot: options?.gitRoot,
  });

  const reminders = await discoverReminderFiles({
    projectRoot: options?.projectRoot,
    homeDir: options?.homeDir,
  });

  // Rules first, then reminders
  return [...rules, ...reminders];
}
