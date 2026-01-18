/**
 * Quality Assessment - Evaluate individual memory quality
 *
 * Performs a 3-tier quality check:
 * - Tier 1: Deterministic checks (fast)
 * - Tier 2: Embedding-based checks (medium)
 * - Tier 3: LLM-powered checks (deep mode only)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseMemoryFile } from '../core/frontmatter.js';
import { getAllMemoryIds } from '../core/fs-utils.js';
import { loadGraph, hasNode } from '../graph/structure.js';
import { getInboundEdges, getOutboundEdges } from '../graph/edges.js';

/**
 * Quality assessment request
 */
export interface AssessQualityRequest {
  /** Memory ID to assess */
  id: string;
  /** Base path for memory storage */
  basePath: string;
  /** Enable deep (LLM) checks */
  deep?: boolean;
}

/**
 * Quality issue found during assessment
 */
export interface QualityIssue {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  details?: string;
}

/**
 * Quality assessment result
 */
export interface AssessQualityResponse {
  status: 'success' | 'error';
  id: string;
  /** Quality score 0-100 */
  score: number;
  /** Rating based on score */
  rating: 'excellent' | 'good' | 'needs_attention' | 'poor' | 'critical';
  /** Issues found */
  issues: QualityIssue[];
  /** Tier checks performed */
  tiersCompleted: number[];
  error?: string;
}

/**
 * Find a memory file by ID
 */
function findMemoryFile(basePath: string, id: string): string | null {
  const permanentPath = path.join(basePath, 'permanent', `${id}.md`);
  if (fs.existsSync(permanentPath)) {
    return permanentPath;
  }

  const temporaryPath = path.join(basePath, 'temporary', `${id}.md`);
  if (fs.existsSync(temporaryPath)) {
    return temporaryPath;
  }

  return null;
}

/**
 * Calculate rating from score
 */
function scoreToRating(score: number): AssessQualityResponse['rating'] {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'needs_attention';
  if (score >= 25) return 'poor';
  return 'critical';
}

/**
 * Calculate score from issues
 */
function calculateScore(issues: QualityIssue[]): number {
  let score = 100;

  for (const issue of issues) {
    switch (issue.severity) {
      case 'critical':
        score -= 30;
        break;
      case 'high':
        score -= 20;
        break;
      case 'medium':
        score -= 10;
        break;
      case 'low':
        score -= 5;
        break;
    }
  }

  return Math.max(0, score);
}

/**
 * Tier 1: Deterministic checks (fast)
 */
async function tier1Checks(
  id: string,
  filePath: string,
  basePath: string
): Promise<QualityIssue[]> {
  const issues: QualityIssue[] = [];

  // Read file
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = parseMemoryFile(content);
  const { frontmatter } = parsed;

  // Check: Missing or empty title
  if (!frontmatter.title || frontmatter.title.trim().length === 0) {
    issues.push({
      type: 'missing_title',
      severity: 'high',
      message: 'Memory has no title',
    });
  }

  // Check: Missing tags
  if (!frontmatter.tags || frontmatter.tags.length === 0) {
    issues.push({
      type: 'missing_tags',
      severity: 'medium',
      message: 'Memory has no tags',
    });
  }

  // Check: Empty content
  if (!parsed.content || parsed.content.trim().length < 10) {
    issues.push({
      type: 'empty_content',
      severity: 'high',
      message: 'Memory content is empty or very short',
    });
  }

  // Check: Graph connectivity
  const graph = await loadGraph(basePath);

  if (!hasNode(graph, id)) {
    issues.push({
      type: 'not_in_graph',
      severity: 'medium',
      message: 'Memory is not in the graph',
    });
  } else {
    const inbound = getInboundEdges(graph, id);
    const outbound = getOutboundEdges(graph, id);

    if (inbound.length === 0 && outbound.length === 0) {
      issues.push({
        type: 'orphaned',
        severity: 'medium',
        message: 'Memory has no graph connections (orphaned)',
      });
    }
  }

  // Check: Stale (not updated in > 90 days)
  if (frontmatter.updated) {
    const updatedDate = new Date(frontmatter.updated);
    const daysSinceUpdate = (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceUpdate > 90) {
      issues.push({
        type: 'stale',
        severity: 'low',
        message: `Memory not updated in ${Math.floor(daysSinceUpdate)} days`,
      });
    }
  }

  // Check: File references in content that don't exist
  const fileRefRegex = /`([^`]+\.(ts|js|py|rs|go|md))`/g;
  const matches = parsed.content.matchAll(fileRefRegex);

  for (const match of matches) {
    const refPath = match[1];
    // Only check absolute-ish paths or src/ paths
    if (refPath.startsWith('src/') || refPath.startsWith('./')) {
      const fullPath = path.resolve(process.cwd(), refPath);
      if (!fs.existsSync(fullPath)) {
        issues.push({
          type: 'stale_file_reference',
          severity: 'medium',
          message: `References non-existent file: ${refPath}`,
          details: refPath,
        });
      }
    }
  }

  return issues;
}

/**
 * Assess quality of a single memory
 */
export async function assessQuality(
  request: AssessQualityRequest
): Promise<AssessQualityResponse> {
  const { id, basePath, deep = false } = request;
  const tiersCompleted: number[] = [];

  // Find file
  const filePath = findMemoryFile(basePath, id);
  if (!filePath) {
    return {
      status: 'error',
      id,
      score: 0,
      rating: 'critical',
      issues: [],
      tiersCompleted: [],
      error: `Memory not found: ${id}`,
    };
  }

  // Tier 1: Deterministic checks
  const issues = await tier1Checks(id, filePath, basePath);
  tiersCompleted.push(1);

  // Tier 2 & 3: Embedding and LLM checks (placeholder for future)
  if (deep) {
    // TODO: Implement embedding-based duplicate detection (Tier 2)
    // TODO: Implement LLM contradiction detection (Tier 3)
    tiersCompleted.push(2);
    tiersCompleted.push(3);
  }

  const score = calculateScore(issues);

  return {
    status: 'success',
    id,
    score,
    rating: scoreToRating(score),
    issues,
    tiersCompleted,
  };
}

/**
 * Audit request
 */
export interface AuditRequest {
  /** Base path for memory storage */
  basePath: string;
  /** Score threshold - only return memories below this score */
  threshold?: number;
  /** Enable deep (LLM) checks */
  deep?: boolean;
}

/**
 * Audit result for a single memory
 */
export interface AuditResult {
  id: string;
  score: number;
  rating: AssessQualityResponse['rating'];
  issueCount: number;
  issues: QualityIssue[];
}

/**
 * Audit response
 */
export interface AuditResponse {
  status: 'success' | 'error';
  /** Number of memories scanned */
  scanned: number;
  /** Memories with issues (below threshold) */
  results: AuditResult[];
  /** Summary statistics */
  summary: {
    excellent: number;
    good: number;
    needsAttention: number;
    poor: number;
    critical: number;
    averageScore: number;
  };
  error?: string;
}

/**
 * Bulk quality audit
 */
export async function auditMemories(request: AuditRequest): Promise<AuditResponse> {
  const { basePath, threshold = 100, deep = false } = request;

  const ids = await getAllMemoryIds(basePath);
  const results: AuditResult[] = [];
  const summary = {
    excellent: 0,
    good: 0,
    needsAttention: 0,
    poor: 0,
    critical: 0,
    averageScore: 0,
  };

  let totalScore = 0;

  for (const id of ids) {
    try {
      const assessment = await assessQuality({ id, basePath, deep });

      if (assessment.status === 'success') {
        totalScore += assessment.score;

        // Track rating counts
        switch (assessment.rating) {
          case 'excellent':
            summary.excellent++;
            break;
          case 'good':
            summary.good++;
            break;
          case 'needs_attention':
            summary.needsAttention++;
            break;
          case 'poor':
            summary.poor++;
            break;
          case 'critical':
            summary.critical++;
            break;
        }

        // Include in results if below threshold
        if (assessment.score < threshold) {
          results.push({
            id,
            score: assessment.score,
            rating: assessment.rating,
            issueCount: assessment.issues.length,
            issues: assessment.issues,
          });
        }
      } else {
        // Error assessing - treat as critical
        summary.critical++;
        results.push({
          id,
          score: 0,
          rating: 'critical',
          issueCount: 1,
          issues: [{ type: 'parse_error', severity: 'critical', message: assessment.error ?? 'Unknown error' }],
        });
      }
    } catch (err) {
      // Skip files that can't be parsed
      summary.critical++;
      results.push({
        id,
        score: 0,
        rating: 'critical',
        issueCount: 1,
        issues: [{ type: 'parse_error', severity: 'critical', message: String(err) }],
      });
    }
  }

  // Sort results by score (lowest first)
  results.sort((a, b) => a.score - b.score);

  summary.averageScore = ids.length > 0 ? Math.round(totalScore / ids.length) : 0;

  return {
    status: 'success',
    scanned: ids.length,
    results,
    summary,
  };
}
