#!/usr/bin/env bun
/**
 * UserPromptSubmit: Semantic memory context injection
 * Replaces user-prompt-submit-memory.sh
 *
 * Uses semantic-memory-search.py to find relevant memories
 * and Ollama to extract actionable gotchas.
 */

import { runHook, allowWithOutput } from '../src/core/error-handler.ts';
import { existsSync, mkdirSync, appendFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { $ } from 'bun';

const OLLAMA_MODEL = 'gemma3:4b';
const OLLAMA_TIMEOUT = 60000;
const OLLAMA_API = 'http://localhost:11434/api/generate';

interface MemorySearchResult {
  memories: Array<{
    id: string;
    file: string;
    score: number;
  }>;
  index_status: string;
  search_time_ms: number;
  threshold_used: number;
  session_prompt_count: number;
}

async function ollamaGenerate(prompt: string, fallback: string): Promise<string> {
  try {
    const response = await fetch(OLLAMA_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        options: { num_ctx: 32768 },
        stream: false,
      }),
      signal: AbortSignal.timeout(OLLAMA_TIMEOUT),
    });

    if (!response.ok) return fallback;

    const data = await response.json() as { response?: string };
    return data.response?.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/[\x00-\x1f]/g, '') || fallback;
  } catch {
    return fallback;
  }
}

runHook(async (input) => {
  // UserPromptSubmit has .prompt at root (see types.ts)
  const userPrompt = input?.prompt || '';
  const sessionId = input?.session_id || '';
  const projectDir = input?.cwd || process.cwd();

  // Setup logging
  let logFile = '';
  if (projectDir && existsSync(join(projectDir, '.claude'))) {
    const logDir = join(projectDir, '.claude', 'logs');
    mkdirSync(logDir, { recursive: true });
    logFile = join(logDir, 'memory-context.log');
  }

  const log = (message: string) => {
    if (!logFile) return;
    const timestamp = new Date().toISOString();
    appendFileSync(logFile, `────────────────────────────────────────\n[${timestamp}] [${sessionId}] Hook: UserPromptSubmit (semantic)\n${message}\n\n`);
  };

  // Skip conditions
  const wordCount = userPrompt.split(/\s+/).length;
  if (wordCount < 5) return allowWithOutput();
  if (userPrompt.startsWith('/')) return allowWithOutput();
  if (/<original_prompt>|<improved_prompt>|<system-reminder>/.test(userPrompt)) return allowWithOutput();
  if (/#skip-memory|#nomem/i.test(userPrompt)) return allowWithOutput();

  // Run semantic search
  let searchResult: MemorySearchResult;
  try {
    const pythonScript = join(homedir(), '.claude', 'hooks', 'semantic-memory-search.py');
    const result = await $`python3 ${pythonScript} --query ${userPrompt} --scope both --hook-type user_prompt --session-id ${sessionId} --project-dir ${projectDir} --limit 5`.quiet();
    searchResult = JSON.parse(result.text());
  } catch {
    return allowWithOutput();
  }

  const memoryCount = searchResult.memories?.length || 0;

  if (memoryCount === 0) {
    const queryPreview = userPrompt.slice(0, 80) + (userPrompt.length > 80 ? '...' : '');
    log(`[SEMANTIC] UserPrompt search
  Query: ${queryPreview}
  Threshold: ${searchResult.threshold_used} (prompt #${searchResult.session_prompt_count})
  Mode: ${searchResult.index_status} | Time: ${searchResult.search_time_ms}ms
  Result: No memories above threshold`);
    return allowWithOutput();
  }

  // Read memory content
  let memoryContent = '';
  for (const memory of searchResult.memories) {
    if (existsSync(memory.file)) {
      const file = Bun.file(memory.file);
      const content = await file.text();
      const lines = content.split('\n').slice(0, 50).join('\n');
      memoryContent += `--- ${memory.file.split('/').pop()} ---\n${lines}\n\n`;
    }
  }

  // Clean up non-gotcha content
  memoryContent = memoryContent
    .replace(/\d+ tests? passing/gi, '')
    .replace(/zero (clippy )?warnings?/gi, '')
    .replace(/all tests pass(ing|ed)?/gi, '')
    .replace(/clippy clean/gi, '')
    .replace(/build succeed(s|ed)?/gi, '')
    .replace(/no (clippy )?warnings?/gi, '')
    .slice(0, 2000);

  const promptContext = userPrompt.slice(0, 200);

  // Ask Ollama to extract relevant gotchas
  const summaryPrompt = `TASK: Extract ONLY actionable warnings from memory notes relevant to this user request.

USER REQUEST: ${promptContext}

MEMORY NOTES:
${memoryContent}

STRICT RULES:
1. Extract ONLY explicit warnings, bugs, gotchas, or "careful/avoid/never" statements
2. The warning must be DIRECTLY relevant to the user's request
3. DO NOT include:
   - Status updates ("tests passing", "build succeeded")
   - Positive outcomes or achievements
   - General descriptions of what code does
   - Vague suggestions ("consider", "might want to")
4. If no ACTIONABLE warnings found, output exactly: No relevant gotchas

OUTPUT FORMAT:
- One bullet per warning, max 80 words total
- Must quote specific technical issue from the notes

YOUR OUTPUT:`;

  const gotchaSummary = (await ollamaGenerate(summaryPrompt, 'Error summarizing'))
    .slice(0, 500)
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const sourceIds = searchResult.memories.map(m => m.id).join(',');
  const memoryList = searchResult.memories.map(m => `    - ${m.id} (score: ${m.score.toString().slice(0, 5)})`).join('\n');
  const queryPreview = userPrompt.slice(0, 80) + (userPrompt.length > 80 ? '...' : '');

  if (!gotchaSummary || /no (relevant )?gotchas|no actionable/i.test(gotchaSummary)) {
    log(`[SEMANTIC] UserPrompt search
  Query: ${queryPreview}
  Threshold: ${searchResult.threshold_used} (prompt #${searchResult.session_prompt_count})
  Mode: ${searchResult.index_status} | Time: ${searchResult.search_time_ms}ms
  Memories found (${memoryCount}):
${memoryList}
  Ollama extraction: No actionable gotchas`);
    return allowWithOutput();
  }

  log(`[SEMANTIC] UserPrompt search
  Query: ${queryPreview}
  Threshold: ${searchResult.threshold_used} (prompt #${searchResult.session_prompt_count})
  Mode: ${searchResult.index_status} | Time: ${searchResult.search_time_ms}ms
  Memories found (${memoryCount}):
${memoryList}
  Gotcha summary: ${gotchaSummary}`);

  let context = `⚠️ MEMORY CONTEXT: ${gotchaSummary}`;
  if (sourceIds) {
    context += `\n📄 Sources: ${sourceIds}`;
  }

  return allowWithOutput(context);
});
