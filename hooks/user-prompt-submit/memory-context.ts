#!/usr/bin/env bun
/**
 * UserPromptSubmit: Memory context injection with graceful degradation
 *
 * Search strategy:
 * 1. Try semantic search (embeddings) if available
 * 2. Fall back to keyword search if semantic fails
 * 3. Use Ollama to extract actionable gotchas from results
 */

import { runHook, allowWithOutput } from '../src/core/error-handler.ts';
import { stat, mkdir, appendFile, readFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

/** Check if a path exists (async alternative to existsSync) */
async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

// Import plugin's search modules
import { searchMemories } from '../../skills/memory/src/core/search.js';
import { semanticSearch, type SemanticSearchResult } from '../../skills/memory/src/search/semantic.js';
import { createOllamaProvider } from '../../skills/memory/src/search/embedding.js';

// Import plugin settings
import { loadSettings, DEFAULT_SETTINGS } from '../src/settings/plugin-settings.ts';

// Settings loaded at hook startup (with fallbacks)
let OLLAMA_MODEL = DEFAULT_SETTINGS.chat_model;
let OLLAMA_HOST = DEFAULT_SETTINGS.ollama_host;
let CONTEXT_WINDOW = DEFAULT_SETTINGS.context_window;
const OLLAMA_TIMEOUT = 30000;

function getOllamaApi(): string {
  return `${OLLAMA_HOST}/api/generate`;
}

interface SearchResultCommon {
  id: string;
  title: string;
  tags: string[];
  score: number;
  file?: string;
}

async function ollamaGenerate(prompt: string, fallback: string): Promise<string> {
  try {
    const response = await fetch(getOllamaApi(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        options: { num_ctx: CONTEXT_WINDOW },
        stream: false,
      }),
      signal: AbortSignal.timeout(OLLAMA_TIMEOUT),
    });

    if (!response.ok) return fallback;

    const data = (await response.json()) as { response?: string };
    return (
      data.response
        ?.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
        .replace(/[\x00-\x1f]/g, '') || fallback
    );
  } catch {
    return fallback;
  }
}

/**
 * Load settings from project directory (called once at hook init)
 */
async function initSettings(projectDir: string): Promise<void> {
  const settings = await loadSettings(projectDir);
  OLLAMA_MODEL = settings.chat_model;
  OLLAMA_HOST = settings.ollama_host;
  CONTEXT_WINDOW = settings.context_window;
}

/**
 * Extract keywords from user prompt for fallback search
 */
function extractKeywords(prompt: string): string[] {
  // Remove common words and extract meaningful terms
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
    'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'about',
    'against', 'between', 'into', 'through', 'during', 'before', 'after',
    'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom',
    'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his',
    'she', 'her', 'it', 'its', 'they', 'them', 'their', 'please', 'want',
    'need', 'help', 'make', 'get', 'let', 'use', 'using', 'used',
  ]);

  return prompt
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 10);
}

/**
 * Try semantic search, return null if unavailable
 */
async function trySemanticSearch(
  query: string,
  basePath: string,
  limit: number
): Promise<SemanticSearchResult[] | null> {
  try {
    // Check if embeddings cache exists
    const embeddingsPath = join(basePath, 'embeddings.json');
    if (!(await pathExists(embeddingsPath))) {
      return null;
    }

    // Check if Ollama is available for generating query embedding
    const ollamaCheck = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(2000),
    }).catch(() => null);

    if (!ollamaCheck?.ok) {
      return null;
    }

    const results = await semanticSearch({
      query,
      basePath,
      provider: createOllamaProvider(),
      threshold: 0.4,
      limit,
    });

    return results.length > 0 ? results : null;
  } catch {
    return null;
  }
}

/**
 * Keyword search fallback
 */
async function keywordSearch(
  keywords: string[],
  basePath: string,
  limit: number
): Promise<SearchResultCommon[]> {
  const results: SearchResultCommon[] = [];
  const seenIds = new Set<string>();

  // Search for each keyword
  for (const keyword of keywords.slice(0, 5)) {
    try {
      const searchResult = await searchMemories({
        query: keyword,
        basePath,
        limit: Math.ceil(limit / 2),
      });

      if (searchResult.status === 'success' && searchResult.results) {
        for (const result of searchResult.results) {
          if (!seenIds.has(result.id)) {
            seenIds.add(result.id);
            results.push({
              id: result.id,
              title: result.title,
              tags: result.tags,
              score: result.score,
            });
          }
        }
      }
    } catch {
      // Continue with other keywords
    }
  }

  // Sort by score and limit
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Get memory file path from ID
 */
async function getMemoryFilePath(basePath: string, id: string): Promise<string> {
  // Check permanent first, then temporary
  const permanentPath = join(basePath, 'permanent', `${id}.md`);
  if (await pathExists(permanentPath)) return permanentPath;

  const temporaryPath = join(basePath, 'temporary', `${id}.md`);
  if (await pathExists(temporaryPath)) return temporaryPath;

  return permanentPath; // Default
}

runHook(async (input) => {
  const userPrompt = input?.prompt || '';
  const sessionId = input?.session_id || '';
  const projectDir = input?.cwd || process.cwd();

  // Load plugin settings (with fallbacks to defaults)
  await initSettings(projectDir);

  // Setup logging
  let logFile = '';
  if (projectDir && (await pathExists(join(projectDir, '.claude')))) {
    const logDir = join(projectDir, '.claude', 'logs');
    await mkdir(logDir, { recursive: true });
    logFile = join(logDir, 'memory-context.log');
  }

  const log = async (message: string) => {
    if (!logFile) return;
    const timestamp = new Date().toISOString();
    await appendFile(
      logFile,
      `────────────────────────────────────────\n[${timestamp}] [${sessionId}]\n${message}\n\n`
    ).catch(() => {}); // Fire-and-forget logging
  };

  // Skip conditions
  const wordCount = userPrompt.split(/\s+/).length;
  if (wordCount < 5) return allowWithOutput();
  if (userPrompt.startsWith('/')) return allowWithOutput();
  if (/<original_prompt>|<improved_prompt>|<system-reminder>/.test(userPrompt))
    return allowWithOutput();
  if (/#skip-memory|#nomem/i.test(userPrompt)) return allowWithOutput();

  // Determine memory paths
  const localMemoryPath = join(projectDir, '.claude', 'memory');
  const globalMemoryPath = join(homedir(), '.claude', 'memory');

  const hasLocalMemory = await pathExists(localMemoryPath);
  const hasGlobalMemory = await pathExists(globalMemoryPath);

  if (!hasLocalMemory && !hasGlobalMemory) {
    return allowWithOutput();
  }

  let results: SearchResultCommon[] = [];
  let searchMethod = 'none';

  // Try semantic search first on local memory
  if (hasLocalMemory) {
    const semanticResults = await trySemanticSearch(userPrompt, localMemoryPath, 5);
    if (semanticResults && semanticResults.length > 0) {
      searchMethod = 'semantic';
      results = semanticResults.map(r => ({
        id: r.id,
        title: r.title,
        tags: r.tags,
        score: r.score,
      }));
    }
  }

  // Fall back to keyword search if semantic failed or returned nothing
  if (results.length === 0) {
    const keywords = extractKeywords(userPrompt);
    if (keywords.length > 0) {
      searchMethod = 'keyword';

      // Search local memory
      if (hasLocalMemory) {
        const localResults = await keywordSearch(keywords, localMemoryPath, 5);
        results.push(...localResults);
      }

      // Search global memory if local didn't find much
      if (results.length < 3 && hasGlobalMemory) {
        const globalResults = await keywordSearch(keywords, globalMemoryPath, 3);
        // Add global results not already in local
        const localIds = new Set(results.map(r => r.id));
        for (const gr of globalResults) {
          if (!localIds.has(gr.id)) {
            results.push(gr);
          }
        }
      }
    }
  }

  if (results.length === 0) {
    log(`Search: ${searchMethod}\nQuery: ${userPrompt.slice(0, 80)}...\nResult: No memories found`);
    return allowWithOutput();
  }

  // Read memory content for gotcha extraction
  let memoryContent = '';
  const memoryPaths: string[] = [];

  for (const memory of results.slice(0, 5)) {
    // Try local path first, then global
    let filePath = await getMemoryFilePath(localMemoryPath, memory.id);
    if (!(await pathExists(filePath))) {
      filePath = await getMemoryFilePath(globalMemoryPath, memory.id);
    }

    if (await pathExists(filePath)) {
      memoryPaths.push(filePath);
      try {
        const content = await readFile(filePath, 'utf-8');
        const lines = content.split('\n').slice(0, 40).join('\n');
        memoryContent += `--- ${memory.id} ---\n${lines}\n\n`;
      } catch {
        // Skip unreadable files
      }
    }
  }

  if (!memoryContent) {
    log(`Search: ${searchMethod}\nFound ${results.length} memories but none readable`);
    return allowWithOutput();
  }

  // Clean up non-gotcha content
  memoryContent = memoryContent
    .replace(/\d+ tests? passing/gi, '')
    .replace(/zero (clippy )?warnings?/gi, '')
    .replace(/all tests pass(ing|ed)?/gi, '')
    .replace(/clippy clean/gi, '')
    .replace(/build succeed(s|ed)?/gi, '')
    .replace(/no (clippy )?warnings?/gi, '')
    .slice(0, 1500);

  const promptContext = userPrompt.slice(0, 200);

  // Ask Ollama to extract relevant gotchas
  const summaryPrompt = `TASK: Extract ONLY actionable warnings from memory notes relevant to this user request.

USER REQUEST: ${promptContext}

MEMORY NOTES:
${memoryContent}

STRICT RULES:
1. Extract ONLY explicit warnings, bugs, gotchas, or "careful/avoid/never" statements
2. The warning must be DIRECTLY relevant to the user's request
3. DO NOT include status updates, achievements, or vague suggestions
4. If no ACTIONABLE warnings found, output exactly: No relevant gotchas

OUTPUT: One bullet per warning, max 60 words total. Quote specific technical issues.`;

  const gotchaSummary = (await ollamaGenerate(summaryPrompt, 'Error summarizing'))
    .slice(0, 400)
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const sourceIds = results.map(m => m.id).join(', ');
  const memoryList = results.map(m => `  - ${m.id} (${m.score.toFixed(2)})`).join('\n');

  if (!gotchaSummary || /no (relevant )?gotchas|no actionable/i.test(gotchaSummary)) {
    log(`Search: ${searchMethod}\nQuery: ${userPrompt.slice(0, 60)}...\nMemories:\n${memoryList}\nOllama: No actionable gotchas`);
    return allowWithOutput();
  }

  log(`Search: ${searchMethod}\nQuery: ${userPrompt.slice(0, 60)}...\nMemories:\n${memoryList}\nGotchas: ${gotchaSummary}`);

  let context = `⚠️ GOTCHAS for ${extractKeywords(userPrompt).slice(0, 3).join(' (+user)')}: ${gotchaSummary}`;
  context += `\n📄 Sources: ${sourceIds}`;

  return allowWithOutput(context);
});
