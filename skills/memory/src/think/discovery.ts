/**
 * Think Discovery Module
 *
 * Recursive discovery of agents and output styles for AI invocation.
 * Searches local, global, and enterprise directories with priority ordering.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DiscoveredFile } from '../types/think.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('think-discovery');

/**
 * Resolve the plugin root directory from the current file's location.
 * This works regardless of where the user runs the command from.
 */
function resolvePluginRoot(): string | null {
  try {
    // Get the directory of this file (works in ESM)
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Navigate up from skills/memory/dist/think/ (or src/think/) to plugin root
    // Try multiple levels to handle both src and dist structures
    let current = __dirname;
    for (let i = 0; i < 6; i++) {
      const pluginJsonPath = path.join(current, '.claude-plugin', 'plugin.json');
      if (fs.existsSync(pluginJsonPath)) {
        return current;
      }
      current = path.dirname(current);
    }
    return null;
  } catch {
    return null;
  }
}

// Cache the plugin root to avoid repeated filesystem lookups
let cachedPluginRoot: string | null | undefined;
function getPluginRoot(): string | null {
  if (cachedPluginRoot === undefined) {
    cachedPluginRoot = resolvePluginRoot();
    if (cachedPluginRoot) {
      log.debug('Resolved plugin root', { path: cachedPluginRoot });
    }
  }
  return cachedPluginRoot;
}

/**
 * Discovery source with priority (lower = higher priority)
 */
type DiscoverySource = 'local' | 'plugin' | 'global' | 'enterprise';

/**
 * Discovery configuration
 */
export interface DiscoveryConfig {
  /** Current working directory (for local scope) */
  basePath: string;
  /** User home directory */
  homePath: string;
  /** Enterprise configuration path (optional) */
  enterprisePath?: string;
  /** Plugin root path (optional, defaults to process.cwd() if plugin detected) */
  pluginPath?: string;
  /** Disable plugin scope discovery (for testing) */
  disablePluginScope?: boolean;
}

/**
 * Default discovery configuration
 */
export function getDefaultConfig(): DiscoveryConfig {
  return {
    basePath: process.cwd(),
    homePath: process.env.HOME ?? '',
    enterprisePath: process.env.CLAUDE_ENTERPRISE_PATH,
  };
}

/**
 * Recursively find all markdown files in a directory
 */
function findMarkdownFilesRecursive(dirPath: string): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dirPath)) {
    return results;
  }

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recurse into subdirectories
        results.push(...findMarkdownFilesRecursive(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(fullPath);
      }
    }
  } catch (error) {
    log.warn('Failed to read directory', { dirPath, error: String(error) });
  }

  return results;
}

/**
 * Extract description from frontmatter
 */
function extractDescription(content: string): string | undefined {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return undefined;
  }

  const frontmatter = frontmatterMatch[1];
  if (!frontmatter) return undefined;
  const descMatch = frontmatter.match(/^description:\s*["']?(.+?)["']?\s*$/m);
  return descMatch?.[1];
}

/**
 * Extract body content (after frontmatter)
 */
export function extractBody(content: string): string {
  const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  if (frontmatterMatch && frontmatterMatch[1] !== undefined) {
    return frontmatterMatch[1].trim();
  }
  // No frontmatter, return entire content
  return content.trim();
}

/**
 * Get agent search paths in priority order
 */
function getAgentPaths(config: DiscoveryConfig): Array<{ path: string; source: DiscoverySource }> {
  const paths: Array<{ path: string; source: DiscoverySource }> = [];

  // Local (highest priority)
  paths.push({
    path: path.join(config.basePath, '.claude', 'agents'),
    source: 'local',
  });

  // Plugin (resolved from actual file location, not cwd)
  if (!config.disablePluginScope) {
    const pluginRoot = config.pluginPath ?? getPluginRoot();
    if (pluginRoot) {
      const pluginAgentsPath = path.join(pluginRoot, 'agents');
      if (fs.existsSync(pluginAgentsPath)) {
        paths.push({
          path: pluginAgentsPath,
          source: 'plugin',
        });
      }
    }
  }

  // Global
  if (config.homePath) {
    paths.push({
      path: path.join(config.homePath, '.claude', 'agents'),
      source: 'global',
    });
  }

  // Enterprise (lowest priority)
  if (config.enterprisePath) {
    paths.push({
      path: path.join(config.enterprisePath, 'agents'),
      source: 'enterprise',
    });
  }

  return paths;
}

/**
 * Get style search paths in priority order
 */
function getStylePaths(config: DiscoveryConfig): Array<{ path: string; source: DiscoverySource }> {
  const paths: Array<{ path: string; source: DiscoverySource }> = [];

  // Local (highest priority)
  paths.push({
    path: path.join(config.basePath, '.claude', 'output-styles'),
    source: 'local',
  });

  // Plugin (resolved from actual file location, not cwd)
  if (!config.disablePluginScope) {
    const pluginRoot = config.pluginPath ?? getPluginRoot();
    if (pluginRoot) {
      const pluginStylesPath = path.join(pluginRoot, 'styles');
      if (fs.existsSync(pluginStylesPath)) {
        paths.push({
          path: pluginStylesPath,
          source: 'plugin',
        });
      }
    }
  }

  // Global
  if (config.homePath) {
    paths.push({
      path: path.join(config.homePath, '.claude', 'output-styles'),
      source: 'global',
    });
  }

  return paths;
}

/**
 * Discover all agents across all scopes
 */
export function discoverAgents(config?: Partial<DiscoveryConfig>): DiscoveredFile[] {
  const fullConfig = { ...getDefaultConfig(), ...config };
  const searchPaths = getAgentPaths(fullConfig);
  const discovered: DiscoveredFile[] = [];
  const seenNames = new Set<string>();

  for (const { path: searchPath, source } of searchPaths) {
    const files = findMarkdownFilesRecursive(searchPath);

    for (const filePath of files) {
      const name = path.basename(filePath, '.md');

      // First match wins (priority ordering)
      if (seenNames.has(name)) {
        log.debug('Skipping duplicate agent', { name, source, filePath });
        continue;
      }

      seenNames.add(name);

      let description: string | undefined;
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        description = extractDescription(content);
      } catch {
        // Ignore read errors for description
      }

      discovered.push({
        name,
        path: filePath,
        source,
        description,
      });
    }
  }

  log.debug('Discovered agents', { count: discovered.length });
  return discovered;
}

/**
 * Discover all output styles across all scopes
 */
export function discoverStyles(config?: Partial<DiscoveryConfig>): DiscoveredFile[] {
  const fullConfig = { ...getDefaultConfig(), ...config };
  const searchPaths = getStylePaths(fullConfig);
  const discovered: DiscoveredFile[] = [];
  const seenNames = new Set<string>();

  for (const { path: searchPath, source } of searchPaths) {
    const files = findMarkdownFilesRecursive(searchPath);

    for (const filePath of files) {
      const name = path.basename(filePath, '.md');

      // First match wins (priority ordering)
      if (seenNames.has(name)) {
        log.debug('Skipping duplicate style', { name, source, filePath });
        continue;
      }

      seenNames.add(name);

      let description: string | undefined;
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        description = extractDescription(content);
      } catch {
        // Ignore read errors for description
      }

      discovered.push({
        name,
        path: filePath,
        source,
        description,
      });
    }
  }

  log.debug('Discovered styles', { count: discovered.length });
  return discovered;
}

/**
 * Find a specific agent by name
 * Returns the first match in priority order (local > global > enterprise)
 */
export function findAgent(
  name: string,
  config?: Partial<DiscoveryConfig>
): DiscoveredFile | null {
  const fullConfig = { ...getDefaultConfig(), ...config };
  const searchPaths = getAgentPaths(fullConfig);

  for (const { path: searchPath, source } of searchPaths) {
    const files = findMarkdownFilesRecursive(searchPath);

    for (const filePath of files) {
      const fileName = path.basename(filePath, '.md');
      if (fileName === name) {
        let description: string | undefined;
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          description = extractDescription(content);
        } catch {
          // Ignore read errors
        }

        log.debug('Found agent', { name, source, filePath });
        return {
          name,
          path: filePath,
          source,
          description,
        };
      }
    }
  }

  log.debug('Agent not found', { name });
  return null;
}

/**
 * Find a specific output style by name
 * Returns the first match in priority order (local > global)
 */
export function findStyle(
  name: string,
  config?: Partial<DiscoveryConfig>
): DiscoveredFile | null {
  const fullConfig = { ...getDefaultConfig(), ...config };
  const searchPaths = getStylePaths(fullConfig);

  for (const { path: searchPath, source } of searchPaths) {
    const files = findMarkdownFilesRecursive(searchPath);

    for (const filePath of files) {
      const fileName = path.basename(filePath, '.md');
      if (fileName === name) {
        let description: string | undefined;
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          description = extractDescription(content);
        } catch {
          // Ignore read errors
        }

        log.debug('Found style', { name, source, filePath });
        return {
          name,
          path: filePath,
          source,
          description,
        };
      }
    }
  }

  log.debug('Style not found', { name });
  return null;
}

/**
 * Read agent body content (for --append-system-prompt)
 */
export function readAgentBody(agentPath: string): string | null {
  try {
    const content = fs.readFileSync(agentPath, 'utf-8');
    return extractBody(content);
  } catch (error) {
    log.error('Failed to read agent body', { agentPath, error: String(error) });
    return null;
  }
}

/**
 * Read style content (for --system-prompt)
 */
export function readStyleContent(stylePath: string): string | null {
  try {
    const content = fs.readFileSync(stylePath, 'utf-8');
    // For styles, we return the full content including frontmatter
    // as it may contain important metadata
    return content;
  } catch (error) {
    log.error('Failed to read style content', { stylePath, error: String(error) });
    return null;
  }
}

/**
 * List available agent names
 */
export function listAgentNames(config?: Partial<DiscoveryConfig>): string[] {
  return discoverAgents(config).map(a => a.name);
}

/**
 * List available style names
 */
export function listStyleNames(config?: Partial<DiscoveryConfig>): string[] {
  return discoverStyles(config).map(s => s.name);
}
