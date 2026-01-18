/**
 * Gotcha injector for contextual warning injection
 *
 * Finds and formats relevant gotcha memories for the current context.
 */

import { listMemories } from '../../../skills/memory/src/core/list.js';
import { readMemory } from '../../../skills/memory/src/core/read.js';
import { MemoryType, Severity } from '../../../skills/memory/src/types/enums.js';
import { extractFilePatterns, matchFileToPatterns } from './pattern-matcher.js';
import { calculateRelevanceScore, type RelevanceContext } from './relevance-scorer.js';
import { type SessionState, hasBeenShown } from '../session/session-state.js';

/**
 * Options for getting relevant gotchas
 */
export interface GetGotchasOptions {
  filePath: string;
  contextTags?: string[];
  basePath: string;
  limit?: number;
  minScore?: number;
}

/**
 * Gotcha result structure
 */
export interface GotchaResult {
  id: string;
  title: string;
  severity: string;
  content: string;
  tags: string[];
  score: number;
}

/**
 * Get relevant gotchas for a file context
 */
export async function getRelevantGotchas(options: GetGotchasOptions): Promise<GotchaResult[]> {
  const { filePath, contextTags = [], basePath, limit = 5, minScore = 0.2 } = options;

  // List all gotcha-type memories
  const listResult = await listMemories({
    basePath,
    type: MemoryType.Gotcha,
  });

  if (listResult.status !== 'success' || !listResult.memories) {
    return [];
  }

  const context: RelevanceContext = {
    filePath,
    contextTags,
  };

  const scoredGotchas: GotchaResult[] = [];

  for (const memory of listResult.memories) {
    // Extract file patterns from tags
    const patterns = extractFilePatterns(memory.tags || []);

    // Check if memory matches by pattern or tags
    const hasPatternMatch = patterns.length > 0 && matchFileToPatterns(filePath, patterns);
    const hasTagMatch =
      contextTags.length > 0 &&
      contextTags.some(ct => memory.tags?.some(mt => mt.toLowerCase() === ct.toLowerCase()));

    // Skip if no match at all
    if (!hasPatternMatch && !hasTagMatch && patterns.length > 0) {
      continue;
    }

    // Calculate relevance score
    const score = calculateRelevanceScore(
      {
        tags: memory.tags || [],
        patterns,
        updated: memory.updated || new Date().toISOString(),
        severity: memory.severity as Severity | undefined,
      },
      context
    );

    if (score >= minScore) {
      // Read full content
      const readResult = await readMemory({ id: memory.id, basePath });
      const content = readResult.memory?.content || '';

      scoredGotchas.push({
        id: memory.id,
        title: memory.title,
        severity: memory.severity || 'medium',
        content,
        tags: memory.tags || [],
        score,
      });
    }
  }

  // Sort by severity first, then by score
  const severityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  scoredGotchas.sort((a, b) => {
    const sevDiff = (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
    if (sevDiff !== 0) return sevDiff;
    return b.score - a.score;
  });

  return scoredGotchas.slice(0, limit);
}

/**
 * Filter out gotchas that have already been shown
 */
export function filterUnshownGotchas(
  gotchas: GotchaResult[],
  sessionState: SessionState
): GotchaResult[] {
  return gotchas.filter(g => !hasBeenShown(sessionState, g.id));
}

/**
 * Severity icons for formatting
 */
const SEVERITY_ICONS: Record<string, string> = {
  critical: '🚨',
  high: '⚠️',
  medium: '⚠️',
  low: 'ℹ️',
};

/**
 * Format gotchas as a warning message
 */
export function formatGotchaWarning(gotchas: GotchaResult[]): string {
  if (gotchas.length === 0) {
    return '';
  }

  const lines: string[] = [];

  for (const gotcha of gotchas) {
    const icon = SEVERITY_ICONS[gotcha.severity] || '⚠️';
    lines.push(`${icon} **${gotcha.title}** (${gotcha.id})`);

    // Add first line of content as summary
    const firstLine = gotcha.content.split('\n').find(l => l.trim() && !l.startsWith('#'));
    if (firstLine) {
      lines.push(`   ${firstLine.trim().slice(0, 100)}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * File extensions that should trigger gotcha injection
 */
const INJECTABLE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.rs',
  '.go',
  '.java',
  '.kt',
  '.swift',
  '.rb',
  '.php',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.cs',
  '.vue',
  '.svelte',
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.md',
  '.mdx',
];

/**
 * File patterns that should NOT trigger gotcha injection
 */
const EXCLUDED_PATTERNS = [
  /\.(png|jpg|jpeg|gif|svg|ico|webp)$/i,
  /\.(woff|woff2|ttf|eot|otf)$/i,
  /\.(zip|tar|gz|rar|7z)$/i,
  /\.(pdf|doc|docx|xls|xlsx)$/i,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /\.claude\/memory\//,
  /~\/\.claude\/memory\//,
  /node_modules\//,
  /\.git\//,
  /dist\//,
  /build\//,
];

/**
 * Check if gotcha injection should happen for this file
 */
export function shouldInjectGotcha(filePath: string): boolean {
  // Check exclusions first
  for (const pattern of EXCLUDED_PATTERNS) {
    if (pattern.test(filePath)) {
      return false;
    }
  }

  // Check if extension is injectable
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  if (INJECTABLE_EXTENSIONS.includes(ext)) {
    return true;
  }

  // Also allow files without extensions in certain directories
  if (
    filePath.includes('/bin/') ||
    filePath.includes('/scripts/') ||
    filePath.endsWith('Makefile') ||
    filePath.endsWith('Dockerfile')
  ) {
    return true;
  }

  // Config files often don't have .json extension
  if (
    filePath.endsWith('rc') ||
    filePath.endsWith('rc.js') ||
    filePath.endsWith('rc.ts') ||
    filePath.endsWith('.config.js') ||
    filePath.endsWith('.config.ts')
  ) {
    return true;
  }

  return false;
}
