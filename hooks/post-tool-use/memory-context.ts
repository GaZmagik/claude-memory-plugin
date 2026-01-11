#!/usr/bin/env bun
/**
 * memory-context.ts - Context-aware memory suggestion hook
 *
 * Two modes:
 * - READ: Suggests checking memory for relevant gotchas/decisions about the file
 * - WRITE: Suggests recording a memory if the action was significant
 *
 * Key behaviour: ONLY outputs to agent when actual gotchas/suggestions are found.
 * Skip/info messages go to log only - no agent spam.
 *
 * Exit codes:
 *   0 - Always (PostToolUse hooks don't block)
 */

import { runHook, allow } from '../src/core/error-handler.ts';
import { generate } from '../src/services/ollama.ts';
import { searchMemories } from '../src/services/semantic-search.ts';
import { createGotchaCache } from '../src/session/session-cache.ts';
import { gotchaCacheKey } from '../src/utils/hash-utils.ts';
import {
  cleanMemoryContent,
  hasNoGotchas,
  cleanGotchaSummary,
} from '../src/memory/topic-classifier.ts';
import { existsSync, readFileSync, mkdirSync, appendFileSync, readdirSync } from 'fs';
import { join, basename, dirname } from 'path';
import { homedir } from 'os';
import type { HookInput } from '../src/core/types.ts';

// Load tool configuration
interface ToolConfig {
  enabled: boolean;
  description: string;
}

interface HookConfig {
  enabledTools: Record<string, ToolConfig>;
}

function loadConfig(): HookConfig {
  const configPath = join(dirname(import.meta.path), 'memory-context-config.json');
  const defaultConfig: HookConfig = {
    enabledTools: {
      Read: { enabled: true, description: 'Inject gotchas when reading files' },
      Write: { enabled: true, description: 'Suggest memory capture after writes' },
      Edit: { enabled: true, description: 'Suggest memory capture after edits' },
      MultiEdit: { enabled: true, description: 'Suggest memory capture after multi-edits' },
    },
  };

  if (!existsSync(configPath)) {
    return defaultConfig;
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as HookConfig;
  } catch {
    return defaultConfig;
  }
}

function isToolEnabled(toolName: string, config: HookConfig): boolean {
  const toolConfig = config.enabledTools[toolName];
  return toolConfig?.enabled ?? false;
}

// Meta-topics to reject (not useful for memory search)
const META_TOPICS = [
  'learning',
  'decision',
  'artifact',
  'gotcha',
  'phase',
  'test',
  'impl',
  'struct',
  'enum',
  'trait',
  'module',
];

// Warning keywords for filtering memory content
const WARNING_KEYWORDS =
  /bug|gotcha|warning|issue|problem|careful|avoid|never|must|critical|fail|error|wrong|broke/i;

// Code file extensions
const CODE_EXTENSIONS = /\.(rs|ts|tsx|js|jsx|py|sh|md|json|toml|yaml|yml)$/;

interface LogContext {
  logFile: string | null;
  sessionId: string;
  toolName: string;
}

/**
 * Setup logging to project's memory-context.log
 */
function setupLogging(projectDir: string, sessionId: string, toolName: string): LogContext {
  let logFile: string | null = null;

  if (projectDir && existsSync(join(projectDir, '.claude'))) {
    const logDir = join(projectDir, '.claude', 'logs');
    mkdirSync(logDir, { recursive: true });
    logFile = join(logDir, 'memory-context.log');
  }

  return { logFile, sessionId, toolName };
}

/**
 * Log message in the same format as the bash script
 */
function log(ctx: LogContext, message: string): void {
  if (!ctx.logFile) return;

  const timestamp = new Date().toISOString();
  const entry = `────────────────────────────────────────
[${timestamp}] [${ctx.sessionId}] Tool: ${ctx.toolName}
${message}

`;
  try {
    appendFileSync(ctx.logFile, entry);
  } catch {
    // Ignore logging errors
  }
}

/**
 * Build topic extraction prompt for Ollama (READ mode)
 */
function buildReadTopicPrompt(fileName: string, filePath: string): string {
  return `You are a code assistant. Given a filename, decide if the developer should check project documentation for gotchas.

File: ${fileName}
Path: ${filePath}

Rules:
- Output CHECK if this is domain-specific code (game logic, physics, UI, save system)
- Output SKIP if this is a config file, test helper, or generic utility
- The topic must be a SINGLE common English word (noun) describing the domain
- DO NOT concatenate filename parts - extract the semantic meaning
- Good topics: orbital, physics, rendering, save, menu, audio, network, player
- Bad topics: orbitalmod, librs, testcoverage, learningphase (these are NOT words)

Reply with ONLY one line in this exact format:
CHECK: <single_word_topic>
OR
SKIP: <reason>

Examples:
File: orbital_mechanics.rs → CHECK: orbital
File: burn_execution.rs → CHECK: manoeuvre
File: save_system.rs → CHECK: save
File: mod.rs → SKIP: module index
File: lib.rs → SKIP: library root
File: Cargo.toml → SKIP: config file`;
}

/**
 * Build write mode prompt for Ollama
 */
function buildWritePrompt(toolName: string, contextSummary: string, fileName: string): string {
  return `You are a code assistant. Decide if this code change should be documented.

Tool: ${toolName}
Action: ${contextSummary}
File: ${fileName}

Rules:
- Output SKIP for routine edits, small fixes, formatting, comments
- Output SUGGEST only for bug fixes, architectural decisions, new patterns
- Most edits should be SKIP

Reply with ONLY one line:
SKIP: <reason>
OR
TYPE: learning
SUGGEST: <what to document>

Examples:
SKIP: routine edit
SKIP: formatting change
TYPE: learning
SUGGEST: Document the X bug fix`;
}

/**
 * Build gotcha extraction prompt
 */
function buildGotchaPrompt(fileName: string, topic: string, memoryContent: string): string {
  return `TASK: Extract ONLY actionable warnings from memory notes.

FILE: ${fileName}
TOPIC: ${topic}

MEMORY NOTES:
${memoryContent}

STRICT RULES:
1. Extract ONLY explicit warnings, bugs, gotchas, or "careful/avoid/never" statements
2. The warning must be DIRECTLY relevant to "${topic}"
3. DO NOT include:
   - Status updates ("tests passing", "build succeeded", "clippy clean")
   - Positive outcomes or achievements
   - General descriptions of what code does
   - Vague suggestions ("consider", "might want to")
4. If no ACTIONABLE warnings found, output exactly: No gotchas found

OUTPUT FORMAT:
- One bullet per warning, max 50 words total
- Must quote specific technical issue from the notes

GOOD (actionable warnings):
- rm -rf on .specify paths destroys shared source (symlinked to ~/.specify)
- Setting is autoCompactEnabled, not autoCompact or auto_compact

BAD (not warnings - DO NOT OUTPUT THESE):
- 582 tests passing (status update, not warning)
- Feature now working correctly (positive outcome, not warning)
- Code refactored for clarity (achievement, not warning)

YOUR OUTPUT:`;
}

/**
 * Extract topic from Ollama response
 */
function parseTopicResponse(response: string): { action: 'check' | 'skip'; value: string } | null {
  const checkMatch = response.match(/CHECK:\s*(\S+)/i);
  if (checkMatch) {
    return { action: 'check', value: checkMatch[1].toLowerCase().replace(/[^a-z]/g, '') };
  }

  const skipMatch = response.match(/SKIP:\s*(.+)/i);
  if (skipMatch) {
    return { action: 'skip', value: skipMatch[1].trim() };
  }

  return null;
}

/**
 * Validate topic is a reasonable word
 */
function validateTopic(topic: string): boolean {
  // Must be 3-15 chars, alphabetic only
  if (!/^[a-z]{3,15}$/.test(topic)) return false;

  // Reject meta-topics
  if (META_TOPICS.some((mt) => topic.includes(mt))) return false;

  return true;
}

/**
 * Search for gotcha-named files in a memory directory
 */
function findGotchaNamedFiles(memDir: string, topic: string): string[] {
  if (!existsSync(memDir)) return [];

  const results: string[] = [];

  try {
    const files = readdirSync(memDir, { recursive: true }) as string[];
    for (const file of files) {
      if (typeof file !== 'string') continue;
      if (file.includes('/archive/')) continue;

      const lower = file.toLowerCase();
      const fullPath = join(memDir, file);

      // Check if file has gotcha/warning in name AND mentions topic
      if ((lower.includes('gotcha') || lower.includes('warning')) && lower.endsWith('.md')) {
        if (lower.includes(topic)) {
          results.push(fullPath);
        } else {
          // Check content for topic mention
          try {
            const content = readFileSync(fullPath, 'utf-8');
            if (content.toLowerCase().includes(topic)) {
              results.push(fullPath);
            }
          } catch {
            // Skip unreadable
          }
        }
      }
    }
  } catch {
    // Ignore errors
  }

  return results.slice(0, 5);
}

/**
 * Check graph.json for linked memories
 */
function findLinkedMemories(memDir: string, foundIds: string[]): string[] {
  const graphFile = join(memDir, 'graph.json');
  if (!existsSync(graphFile)) return [];

  const linked: string[] = [];

  try {
    const graph = JSON.parse(readFileSync(graphFile, 'utf-8'));
    const edges = graph.edges || [];

    for (const id of foundIds) {
      for (const edge of edges) {
        let linkedId: string | null = null;
        if (edge.source === id) linkedId = edge.target;
        else if (edge.target === id) linkedId = edge.source;

        if (linkedId && (linkedId.includes('learning') || linkedId.includes('decision'))) {
          // Find the file
          const files = readdirSync(memDir, { recursive: true }) as string[];
          for (const file of files) {
            if (typeof file === 'string' && file.endsWith(`${linkedId}.md`)) {
              linked.push(join(memDir, file));
              break;
            }
          }
        }
      }
    }
  } catch {
    // Ignore errors
  }

  return linked.slice(0, 3);
}

/**
 * Filter files by warning keywords
 */
function filterByWarningKeywords(files: string[]): string[] {
  const gotchaFiles: string[] = [];
  const otherFiles: string[] = [];

  for (const f of files) {
    const fname = basename(f).toLowerCase();

    // Priority 1: Files with "gotcha" or "warning" in name
    if (fname.includes('gotcha') || fname.includes('warning')) {
      gotchaFiles.push(f);
    } else {
      // Priority 2: Check content for warning keywords
      try {
        const content = readFileSync(f, 'utf-8');
        if (WARNING_KEYWORDS.test(content)) {
          otherFiles.push(f);
        }
      } catch {
        // Skip unreadable
      }
    }
  }

  return [...gotchaFiles, ...otherFiles].slice(0, 5);
}

/**
 * READ mode: Check memory for gotchas when reading a file
 */
async function handleReadMode(
  input: HookInput,
  ctx: LogContext,
  projectDir: string
): Promise<{ reminder: string } | null> {
  const filePath = input.tool_input?.file_path as string;
  if (!filePath) return null;

  const fileName = basename(filePath);

  // Skip non-code files
  if (!CODE_EXTENSIONS.test(fileName)) {
    return null;
  }

  // Ask Ollama for topic extraction
  const prompt = buildReadTopicPrompt(fileName, filePath);
  const response = await generate(prompt);
  const parsed = parseTopicResponse(response);

  if (!parsed) {
    return null;
  }

  if (parsed.action === 'skip') {
    log(ctx, `ℹ️ Memory check skipped: ${parsed.value}`);
    return null;
  }

  const topic = parsed.value;

  // Validate topic
  if (!validateTopic(topic)) {
    log(ctx, `ℹ️ Memory check skipped: invalid topic extracted (raw: ${topic})`);
    return null;
  }

  const sessionId = input.session_id || 'unknown';
  const home = homedir();
  const projectMemDir = join(projectDir, '.claude', 'memory');
  const userMemDir = join(home, '.claude', 'memory');

  // Determine if we should search user memory (file outside project)
  const searchUserMem = !filePath.startsWith(projectDir);

  // Search strategies
  let allFiles: string[] = [];

  // 1. Semantic search
  const searchResult = await searchMemories(
    `${fileName} ${topic} gotcha warning`,
    searchUserMem ? 'both' : 'local',
    projectDir,
    'post_tool_use',
    sessionId,
    5
  );

  const semanticFiles = searchResult.memories.map((m) => m.file).filter(Boolean) as string[];

  log(
    ctx,
    `[SEMANTIC] Search for: ${fileName} (${topic})
  Query: ${fileName} ${topic} gotcha warning
  Threshold: ${searchResult.threshold_used} | Mode: ${searchResult.index_status} | Time: ${searchResult.search_time_ms}ms
  Results (${searchResult.memories.length}):
${searchResult.memories.map((m) => `  - ${m.id} (score: ${String(m.score).slice(0, 5)})`).join('\n')}`
  );

  allFiles.push(...semanticFiles);

  // 2. Gotcha-named files
  if (existsSync(projectMemDir)) {
    allFiles.push(...findGotchaNamedFiles(projectMemDir, topic));
  }
  if (searchUserMem && existsSync(userMemDir)) {
    allFiles.push(...findGotchaNamedFiles(userMemDir, topic));
  }

  // 3. Graph links
  const foundIds = searchResult.memories.map((m) => m.id);
  if (existsSync(projectMemDir)) {
    allFiles.push(...findLinkedMemories(projectMemDir, foundIds));
  }
  if (searchUserMem && existsSync(userMemDir)) {
    allFiles.push(...findLinkedMemories(userMemDir, foundIds));
  }

  // Deduplicate and filter
  allFiles = [...new Set(allFiles)];
  const relevantFiles = filterByWarningKeywords(allFiles);

  const scopeIndicator = searchUserMem ? ' (+user)' : '';

  if (relevantFiles.length === 0) {
    log(ctx, `ℹ️ Topic: ${topic}${scopeIndicator} - no relevant gotchas in memory`);
    return null;
  }

  // Read and concatenate memory content
  let memoryContent = '';
  const sourceIds: string[] = [];

  for (const f of relevantFiles) {
    try {
      const content = readFileSync(f, 'utf-8');
      const lines = content.split('\n').slice(0, 50).join('\n');
      memoryContent += `--- ${basename(f)} ---\n${lines}\n\n`;
      sourceIds.push(basename(f, '.md'));
    } catch {
      // Skip unreadable
    }
  }

  // Clean content
  memoryContent = cleanMemoryContent(memoryContent).slice(0, 2000);

  // Ask Ollama for gotcha extraction
  const gotchaPrompt = buildGotchaPrompt(fileName, topic, memoryContent);
  const gotchaSummary = await generate(gotchaPrompt);
  const cleanedSummary = cleanGotchaSummary(gotchaSummary).slice(0, 500);

  if (hasNoGotchas(cleanedSummary)) {
    log(
      ctx,
      `ℹ️ Topic: ${topic}${scopeIndicator} - checked memory, no specific gotchas found
Sources checked:
${relevantFiles.map((f) => `  - ${basename(f)}`).join('\n')}`
    );
    return null;
  }

  // Check session cache for deduplication
  const cache = createGotchaCache(projectDir, sessionId);
  const cacheKey = gotchaCacheKey(topic, cleanedSummary);

  if (cache.has(cacheKey)) {
    log(ctx, `ℹ️ Topic: ${topic}${scopeIndicator} - gotcha already shown this session`);
    return null;
  }

  cache.add(cacheKey);

  const reminder = `⚠️ GOTCHAS for ${topic}${scopeIndicator}: ${cleanedSummary}\n📄 Sources: ${sourceIds.join(', ')}`;

  log(
    ctx,
    `${reminder}
Sources:
${relevantFiles.map((f) => `  - ${basename(f)}`).join('\n')}`
  );

  return { reminder };
}

/**
 * WRITE mode: Suggest memory capture for significant changes
 */
async function handleWriteMode(
  input: HookInput,
  ctx: LogContext
): Promise<{ reminder: string } | null> {
  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};

  // Build context summary
  let contextSummary: string;
  let fileName: string;

  if (toolName === 'TodoWrite') {
    const todos = (toolInput.todos as Array<{ status: string }>) || [];
    const completed = todos.filter((t) => t.status === 'completed').length;
    contextSummary = `Completed ${completed} todo item(s)`;
    fileName = 'TodoWrite';
  } else {
    const filePath = (toolInput.file_path as string) || 'unknown';
    fileName = basename(filePath);
    contextSummary = `Modified file: ${fileName}`;
  }

  // Ask Ollama
  const prompt = buildWritePrompt(toolName, contextSummary, fileName);
  const response = await generate(prompt);

  // Check for SKIP
  const skipMatch = response.match(/SKIP:\s*(.+)/i);
  if (skipMatch) {
    const reason = skipMatch[1].trim();
    log(ctx, `ℹ️ Memory capture skipped: ${reason}`);
    return null;
  }

  // Extract suggestion
  const suggestMatch = response.match(/SUGGEST:\s*(.+)/i);
  if (!suggestMatch) {
    return null;
  }

  const suggestion = suggestMatch[1].trim();
  const typeMatch = response.match(/TYPE:\s*(\w+)/i);
  const memoryType = typeMatch ? typeMatch[1] : 'learning';

  const reminder = `⚠️ SYSTEM NOTICE: Evaluate memory capture (${memoryType}) before next action. ${suggestion}`;
  log(ctx, reminder);

  return { reminder };
}

// Main hook
runHook(async (input) => {
  // Only process PostToolUse events
  if (!input || input.hook_event_name !== 'PostToolUse') {
    return allow();
  }

  const toolName = input.tool_name || '';
  const projectDir = input.cwd || process.cwd();
  const sessionId = input.session_id || 'unknown';

  // Load config and check if tool is enabled
  const config = loadConfig();
  if (!isToolEnabled(toolName, config)) {
    return allow();
  }

  const ctx = setupLogging(projectDir, sessionId, toolName);

  // READ mode
  if (toolName === 'Read') {
    const result = await handleReadMode(input, ctx, projectDir);
    if (result) {
      return {
        exitCode: 0,
        output: {
          hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext: result.reminder,
          },
        },
      };
    }
    return allow();
  }

  // WRITE mode (any enabled tool that's not Read)
  if (toolName !== 'Read') {
    const result = await handleWriteMode(input, ctx);
    if (result) {
      return {
        exitCode: 0,
        output: {
          hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext: result.reminder,
          },
        },
      };
    }
    return allow();
  }

  return allow();
});
