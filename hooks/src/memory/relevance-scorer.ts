/**
 * T111: Relevance scorer for memory context injection
 *
 * Calculates relevance scores based on tags, file patterns,
 * recency, and severity.
 */

import { Severity } from '../../../skills/memory/src/types/enums.js';
import { getMatchType } from './pattern-matcher.js';

/**
 * Context for relevance scoring
 */
export interface RelevanceContext {
  filePath: string;
  contextTags?: string[];
}

/**
 * Weights for combining relevance scores
 */
export interface RelevanceWeights {
  tagMatch: number;
  fileMatch: number;
  recency: number;
  severity: number;
}

/**
 * Default weights for relevance scoring
 */
export const DEFAULT_WEIGHTS: RelevanceWeights = {
  tagMatch: 0.3,
  fileMatch: 0.4,
  recency: 0.2,
  severity: 0.1,
};

/**
 * Calculate tag match score
 *
 * Returns a score from 0-1 based on how many context tags
 * match the memory's tags. More matches = higher score.
 */
export function scoreTagMatch(memoryTags: string[], contextTags: string[]): number {
  if (memoryTags.length === 0 || contextTags.length === 0) {
    return 0;
  }

  const memoryTagSet = new Set(memoryTags.map(t => t.toLowerCase()));
  const contextTagSet = new Set(contextTags.map(t => t.toLowerCase()));

  let matchCount = 0;
  for (const tag of contextTagSet) {
    if (memoryTagSet.has(tag)) {
      matchCount++;
    }
  }

  if (matchCount === 0) {
    return 0;
  }

  // Score based on proportion of context tags matched
  // Plus a small bonus for absolute number of matches
  const proportionScore = matchCount / contextTags.length;
  const absoluteBonus = Math.min(0.1, matchCount * 0.02);

  return Math.min(1.0, proportionScore + absoluteBonus);
}

/**
 * Calculate file match score
 *
 * Returns a score from 0-1 based on how well the file
 * matches the memory's patterns.
 */
export function scoreFileMatch(filePath: string, patterns: string[]): number {
  if (patterns.length === 0) {
    return 0;
  }

  const matchType = getMatchType(filePath, patterns);

  switch (matchType) {
    case 'exact':
      return 1.0;
    case 'directory':
      return 0.8;
    case 'glob':
      return 0.6;
    case 'none':
    default:
      return 0;
  }
}

/**
 * Calculate recency score
 *
 * Returns a score from 0.1-1 based on how recently
 * the memory was updated. Decays over time.
 */
export function scoreRecency(updatedAt: string): number {
  const updatedTime = new Date(updatedAt).getTime();
  const now = Date.now();
  const ageMs = now - updatedTime;

  // Convert to days
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  // Exponential decay with half-life of 30 days
  const halfLife = 30;
  const decayFactor = Math.pow(0.5, ageDays / halfLife);

  // Minimum score of 0.1 for very old memories
  return Math.max(0.1, decayFactor);
}

/**
 * Calculate severity score
 *
 * Returns a score from 0.3-1 based on severity level.
 */
export function scoreSeverity(severity: Severity | undefined): number {
  switch (severity) {
    case Severity.Critical:
      return 1.0;
    case Severity.High:
      return 0.8;
    case Severity.Medium:
      return 0.5;
    case Severity.Low:
      return 0.3;
    default:
      return 0.5; // Default to medium
  }
}

/**
 * Individual score components
 */
export interface ScoreComponents {
  tagMatch: number;
  fileMatch: number;
  recency: number;
  severity: number;
}

/**
 * Combine individual scores using weights
 */
export function combineScores(
  scores: ScoreComponents,
  weights: RelevanceWeights = DEFAULT_WEIGHTS
): number {
  const totalWeight = weights.tagMatch + weights.fileMatch + weights.recency + weights.severity;

  const weightedSum =
    scores.tagMatch * weights.tagMatch +
    scores.fileMatch * weights.fileMatch +
    scores.recency * weights.recency +
    scores.severity * weights.severity;

  return weightedSum / totalWeight;
}

/**
 * Memory data for relevance scoring
 */
export interface MemoryForScoring {
  tags: string[];
  patterns: string[];
  updated: string;
  severity?: Severity;
}

/**
 * Calculate overall relevance score for a memory
 */
export function calculateRelevanceScore(
  memory: MemoryForScoring,
  context: RelevanceContext,
  weights: RelevanceWeights = DEFAULT_WEIGHTS
): number {
  const scores: ScoreComponents = {
    tagMatch: scoreTagMatch(memory.tags, context.contextTags || []),
    fileMatch: scoreFileMatch(context.filePath, memory.patterns),
    recency: scoreRecency(memory.updated),
    severity: scoreSeverity(memory.severity),
  };

  return combineScores(scores, weights);
}

/**
 * Sort memories by relevance score
 */
export function sortByRelevance<T extends MemoryForScoring>(
  memories: T[],
  context: RelevanceContext,
  weights: RelevanceWeights = DEFAULT_WEIGHTS
): Array<T & { relevanceScore: number }> {
  return memories
    .map(memory => ({
      ...memory,
      relevanceScore: calculateRelevanceScore(memory, context, weights),
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Filter memories by minimum relevance threshold
 */
export function filterByRelevance<T extends MemoryForScoring>(
  memories: T[],
  context: RelevanceContext,
  minScore: number = 0.3,
  weights: RelevanceWeights = DEFAULT_WEIGHTS
): T[] {
  return memories.filter(memory => {
    const score = calculateRelevanceScore(memory, context, weights);
    return score >= minScore;
  });
}
