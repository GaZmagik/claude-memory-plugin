#!/usr/bin/env bun
/**
 * SessionStart: Inject memory index summary as context
 *
 * Provides agent with a "table of contents" of available memories
 * plus semantic search results based on git branch context.
 */

import { runHook, allow } from '../src/core/error-handler.ts';
import { existsSync, readFileSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { spawn } from '../src/core/subprocess.ts';

interface MemoryEntry {
  id: string;
  title?: string;
  type?: string;
  tags?: string[];
  updated?: string;
  score?: number;
}

interface IndexData {
  memories: MemoryEntry[];
}

function logOutput(logFile: string | null, sessionId: string, message: string): void {
  if (!logFile) return;
  try {
    const timestamp = new Date().toISOString();
    appendFileSync(
      logFile,
      `────────────────────────────────────────\n[${timestamp}] [${sessionId}] Hook: SessionStart (semantic)\n${message}\n\n`
    );
  } catch {
    // Ignore logging errors
  }
}

async function getBranchContext(projectDir: string): Promise<string> {
  if (!existsSync(join(projectDir, '.git'))) {
    return '';
  }

  const result = await spawn(['git', '-C', projectDir, 'branch', '--show-current'], {
    timeout: 5000,
  });

  if (!result.success || !result.stdout.trim()) {
    return '';
  }

  // Convert branch name to search terms (feature/008-outstanding-orders -> "outstanding orders")
  return result.stdout
    .trim()
    .replace(/^[a-z]*\//, '')
    .replace(/-/g, ' ')
    .replace(/[0-9]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function semanticSearch(
  query: string,
  sessionId: string,
  projectDir: string,
  logFile: string | null
): Promise<string> {
  if (!query || query.length < 5) {
    return '';
  }

  const searchScript = join(homedir(), '.claude', 'hooks', 'semantic-memory-search.py');
  if (!existsSync(searchScript)) {
    return '';
  }

  try {
    const result = await spawn(
      [
        'python3',
        searchScript,
        '--query',
        query,
        '--scope',
        'both',
        '--hook-type',
        'session_start',
        '--session-id',
        sessionId,
        '--project-dir',
        projectDir,
        '--limit',
        '5',
      ],
      {
        timeout: 10000,
      }
    );

    if (!result.success) {
      return '';
    }

    const data = JSON.parse(result.stdout);
    const memories = data.memories || [];

    if (memories.length === 0) {
      return '';
    }

    // Log search results
    const memList = memories
      .map((m: MemoryEntry) => `    - ${m.id} (score: ${String(m.score || 0).slice(0, 5)})`)
      .join('\n');

    logOutput(
      logFile,
      sessionId,
      `[SEMANTIC] SessionStart search
  Query: ${query}
  Threshold: ${data.threshold_used || 0} | Mode: ${data.index_status || 'unknown'} | Time: ${data.search_time_ms || 0}ms
  Results (${memories.length}):
${memList}`
    );

    // Format for output
    const formatted = memories
      .map((m: MemoryEntry) => `    - ${m.id} (${m.type || 'unknown'}, ${String(m.score || 0).slice(0, 4)})`)
      .join('\n');

    return `  🔍 Relevant to current work:\n${formatted}`;
  } catch {
    return '';
  }
}

function buildSummary(indexFile: string, scope: string): string {
  if (!existsSync(indexFile)) {
    return '';
  }

  try {
    const data: IndexData = JSON.parse(readFileSync(indexFile, 'utf-8'));
    const memories = data.memories || [];

    // Count by type prefix
    const decisions = memories.filter(m => m.id.startsWith('decision-')).length;
    const learnings = memories.filter(m => m.id.startsWith('learning-')).length;
    const artifacts = memories.filter(m => m.id.startsWith('artifact-')).length;
    const other = memories.filter(
      m => !m.id.startsWith('decision-') && !m.id.startsWith('learning-') && !m.id.startsWith('artifact-')
    ).length;

    // Get critical/gotcha items
    const criticalGotchas = memories
      .filter(m => m.tags?.includes('critical') || m.tags?.includes('gotcha'))
      .slice(0, 10)
      .map(m => `    - ${m.id}: ${m.title || '---'}`)
      .join('\n');

    // Get recent memories (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentDate = sevenDaysAgo.toISOString().slice(0, 11);

    const recent = memories
      .filter(m => m.updated && m.updated > recentDate)
      .slice(0, 5)
      .map(m => m.id)
      .join(',');

    let summary = `[${scope}] Decisions: ${decisions} | Learnings: ${learnings} | Artifacts: ${artifacts} | Other: ${other}`;

    if (criticalGotchas) {
      summary += `\n  ⚠️ Critical/Gotchas:\n${criticalGotchas}`;
    }

    if (recent) {
      summary += `\n  📅 Recent (7d): ${recent}`;
    }

    return summary;
  } catch {
    return '';
  }
}

runHook(async (input) => {
  const projectDir = input?.cwd || process.cwd();
  const sessionId = input?.session_id || '';
  const home = homedir();

  const localIndex = join(projectDir, '.claude', 'memory', 'index.json');
  const globalIndex = join(home, '.claude', 'memory', 'index.json');

  // Set up logging
  let logFile: string | null = null;
  const logDir = join(projectDir, '.claude', 'logs');
  if (existsSync(join(projectDir, '.claude'))) {
    mkdirSync(logDir, { recursive: true });
    logFile = join(logDir, 'memory-context.log');
  }

  // Check if any index exists
  if (!existsSync(localIndex) && !existsSync(globalIndex)) {
    return allow();
  }

  let summary = '📚 Memory Index Available:\n';

  // Build local summary
  if (existsSync(localIndex)) {
    const localSummary = buildSummary(localIndex, 'Local');
    if (localSummary) {
      summary += localSummary + '\n';
    }
  }

  // Build global summary
  if (existsSync(globalIndex)) {
    const globalSummary = buildSummary(globalIndex, 'Global');
    if (globalSummary) {
      summary += globalSummary + '\n';
    }
  }

  // Add semantic search based on branch context
  const branchContext = await getBranchContext(projectDir);
  if (branchContext) {
    const semanticResults = await semanticSearch(branchContext, sessionId, projectDir, logFile);
    if (semanticResults) {
      summary += '\n' + semanticResults + '\n';
    }
  }

  summary += "\n💡 Use 'memory search <topic>' to find relevant memories before starting work.";

  return {
    exitCode: 0,
    output: {
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: summary,
      },
    },
  };
});
