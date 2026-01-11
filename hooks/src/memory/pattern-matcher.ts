/**
 * T110: File pattern matcher for hooks
 *
 * Matches file paths against patterns for gotcha injection
 * and relevance scoring.
 */

import { minimatch } from 'minimatch';

/**
 * Normalise a file path for consistent matching
 */
export function normalisePattern(pattern: string): string {
  let normalised = pattern.trim();

  // Convert backslashes to forward slashes
  normalised = normalised.replace(/\\/g, '/');

  // Remove leading ./
  if (normalised.startsWith('./')) {
    normalised = normalised.slice(2);
  }

  return normalised;
}

/**
 * Check if a pattern contains glob characters
 */
export function isGlobPattern(pattern: string): boolean {
  return /[*?[\]]/.test(pattern);
}

/**
 * Match a file path against a glob pattern
 */
export function matchesGlob(filePath: string, pattern: string): boolean {
  const normalisedPath = normalisePattern(filePath);
  const normalisedPattern = normalisePattern(pattern);

  return minimatch(normalisedPath, normalisedPattern, {
    nocase: true,
    dot: true,
    matchBase: !normalisedPattern.includes('/'),
  });
}

/**
 * Extract file patterns from memory tags
 *
 * Recognises:
 * - file:path/to/file.ts
 * - pattern:*.spec.ts
 * - dir:src/utils
 */
export function extractFilePatterns(tags: string[]): string[] {
  const patterns: string[] = [];

  for (const tag of tags) {
    if (tag.startsWith('file:')) {
      patterns.push(tag.slice(5));
    } else if (tag.startsWith('pattern:')) {
      patterns.push(tag.slice(8));
    } else if (tag.startsWith('dir:')) {
      patterns.push(tag.slice(4));
    }
  }

  return patterns;
}

/**
 * Check if a file matches any of the given patterns
 */
export function matchFileToPatterns(filePath: string, patterns: string[]): boolean {
  if (patterns.length === 0) {
    return false;
  }

  const normalisedPath = normalisePattern(filePath);

  for (const pattern of patterns) {
    const normalisedPattern = normalisePattern(pattern);

    // Exact match
    if (normalisedPath === normalisedPattern) {
      return true;
    }

    // Directory match (pattern ends with /)
    if (normalisedPattern.endsWith('/')) {
      if (normalisedPath.startsWith(normalisedPattern)) {
        return true;
      }
      // Also check without trailing slash
      const dirWithoutSlash = normalisedPattern.slice(0, -1);
      if (normalisedPath.startsWith(dirWithoutSlash + '/')) {
        return true;
      }
    }

    // Glob pattern match
    if (isGlobPattern(normalisedPattern)) {
      if (matchesGlob(normalisedPath, normalisedPattern)) {
        return true;
      }
    }

    // Check if file is within directory
    if (!isGlobPattern(normalisedPattern) && !normalisedPattern.includes('.')) {
      if (normalisedPath.startsWith(normalisedPattern + '/')) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get match type for scoring purposes
 */
export type MatchType = 'exact' | 'directory' | 'glob' | 'none';

/**
 * Determine how a file matches a pattern
 */
export function getMatchType(filePath: string, patterns: string[]): MatchType {
  if (patterns.length === 0) {
    return 'none';
  }

  const normalisedPath = normalisePattern(filePath);

  for (const pattern of patterns) {
    const normalisedPattern = normalisePattern(pattern);

    // Exact match
    if (normalisedPath === normalisedPattern) {
      return 'exact';
    }
  }

  // Check for directory matches
  for (const pattern of patterns) {
    const normalisedPattern = normalisePattern(pattern);
    if (normalisedPattern.endsWith('/') || !normalisedPattern.includes('.')) {
      const dir = normalisedPattern.replace(/\/$/, '');
      if (normalisedPath.startsWith(dir + '/')) {
        return 'directory';
      }
    }
  }

  // Check for glob matches
  for (const pattern of patterns) {
    const normalisedPattern = normalisePattern(pattern);
    if (isGlobPattern(normalisedPattern)) {
      if (matchesGlob(normalisedPath, normalisedPattern)) {
        return 'glob';
      }
    }
  }

  return 'none';
}

/**
 * Get all matching patterns for a file
 */
export function getMatchingPatterns(filePath: string, patterns: string[]): string[] {
  const matches: string[] = [];
  const normalisedPath = normalisePattern(filePath);

  for (const pattern of patterns) {
    const normalisedPattern = normalisePattern(pattern);

    if (normalisedPath === normalisedPattern) {
      matches.push(pattern);
      continue;
    }

    if (normalisedPattern.endsWith('/')) {
      if (normalisedPath.startsWith(normalisedPattern)) {
        matches.push(pattern);
        continue;
      }
    }

    if (isGlobPattern(normalisedPattern)) {
      if (matchesGlob(normalisedPath, normalisedPattern)) {
        matches.push(pattern);
      }
    }
  }

  return matches;
}
