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
import { stat, readFile, mkdir, appendFile, readdir } from 'fs/promises';
import { join, basename, dirname } from 'path';

/** Check if a path exists (async alternative to existsSync) */
async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}
import { homedir } from 'os';
import type { HookInput } from '../src/core/types.ts';

// Load tool configuration
interface ToolConfig {
  enabled: boolean;
  description: string;
}

interface BashCommandConfig {
  enabled: boolean;
  description: string;
}

interface BashCommandsConfig {
  mode: 'allowlist' | 'blocklist';
  commands: Record<string, BashCommandConfig>;
}

interface HookConfig {
  enabledTools: Record<string, ToolConfig>;
  bashCommands?: BashCommandsConfig;
}

async function loadConfig(): Promise<HookConfig> {
  const configPath = join(dirname(import.meta.path), 'memory-context-config.json');
  const defaultConfig: HookConfig = {
    enabledTools: {
      Read: { enabled: true, description: 'Inject gotchas when reading files' },
      Write: { enabled: true, description: 'Suggest memory capture after writes' },
      Edit: { enabled: true, description: 'Suggest memory capture after edits' },
      MultiEdit: { enabled: true, description: 'Suggest memory capture after multi-edits' },
    },
  };

  if (!(await pathExists(configPath))) {
    return defaultConfig;
  }

  try {
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content) as HookConfig;
  } catch {
    return defaultConfig;
  }
}

/**
 * Extract the base command from a Bash command string
 * e.g., "git status" -> "git", "npm run build" -> "npm"
 */
function extractBashCommand(commandStr: string): string | null {
  if (!commandStr) return null;

  // Handle common shell prefixes
  const cleaned = commandStr
    .replace(/^(env\s+\w+=\S+\s+)+/, '') // Remove env vars
    .replace(/^(sudo\s+)/, '') // Remove sudo
    .replace(/^(nohup\s+)/, '') // Remove nohup
    .replace(/^(timeout\s+\S+\s+)/, '') // Remove timeout
    .trim();

  // Get the first word (the command)
  const match = cleaned.match(/^([\w.-]+)/);
  return match && match[1] ? match[1] : null;
}

/**
 * Check if a Bash command is enabled in the config
 */
function isBashCommandEnabled(commandStr: string, config: HookConfig): boolean {
  const bashConfig = config.bashCommands;
  if (!bashConfig) {
    // No bash config means allow all bash commands if Bash tool is enabled
    return true;
  }

  const baseCommand = extractBashCommand(commandStr);
  if (!baseCommand) {
    return false;
  }

  const commandConfig = bashConfig.commands[baseCommand];

  if (bashConfig.mode === 'allowlist') {
    // Only enabled commands are allowed
    return commandConfig?.enabled ?? false;
  } else {
    // Blocklist mode: all commands allowed unless explicitly disabled
    return commandConfig?.enabled ?? true;
  }
}

function isToolEnabled(toolName: string, config: HookConfig, toolInput?: Record<string, unknown>): boolean {
  const toolConfig = config.enabledTools[toolName];
  if (!toolConfig?.enabled) {
    return false;
  }

  // Special handling for Bash - check command allowlist
  if (toolName === 'Bash' && toolInput?.command) {
    return isBashCommandEnabled(toolInput.command as string, config);
  }

  return true;
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
async function setupLogging(projectDir: string, sessionId: string, toolName: string): Promise<LogContext> {
  let logFile: string | null = null;

  if (projectDir && (await pathExists(join(projectDir, '.claude')))) {
    const logDir = join(projectDir, '.claude', 'logs');
    await mkdir(logDir, { recursive: true });
    logFile = join(logDir, 'memory-context.log');
  }

  return { logFile, sessionId, toolName };
}

/**
 * Log message in the same format as the bash script (fire-and-forget)
 */
async function log(ctx: LogContext, message: string): Promise<void> {
  if (!ctx.logFile) return;

  const timestamp = new Date().toISOString();
  const entry = `────────────────────────────────────────
[${timestamp}] [${ctx.sessionId}] Tool: ${ctx.toolName}
${message}

`;
  await appendFile(ctx.logFile, entry).catch(() => {}); // Fire-and-forget
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
  if (checkMatch && checkMatch[1]) {
    return { action: 'check', value: checkMatch[1].toLowerCase().replace(/[^a-z]/g, '') };
  }

  const skipMatch = response.match(/SKIP:\s*(.+)/i);
  if (skipMatch && skipMatch[1]) {
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
async function findGotchaNamedFiles(memDir: string, topic: string): Promise<string[]> {
  if (!(await pathExists(memDir))) return [];

  const results: string[] = [];

  try {
    const files = await readdir(memDir, { recursive: true }) as string[];
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
            const content = await readFile(fullPath, 'utf-8');
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
async function findLinkedMemories(memDir: string, foundIds: string[]): Promise<string[]> {
  const graphFile = join(memDir, 'graph.json');
  if (!(await pathExists(graphFile))) return [];

  const linked: string[] = [];

  try {
    const graph = JSON.parse(await readFile(graphFile, 'utf-8'));
    const edges = graph.edges || [];

    // Build adjacency map for O(1) edge lookups (was O(n×m) nested loop)
    const adjacencyMap = new Map<string, Set<string>>();
    for (const edge of edges) {
      if (!adjacencyMap.has(edge.source)) adjacencyMap.set(edge.source, new Set());
      if (!adjacencyMap.has(edge.target)) adjacencyMap.set(edge.target, new Set());
      adjacencyMap.get(edge.source)!.add(edge.target);
      adjacencyMap.get(edge.target)!.add(edge.source);
    }

    // Read directory once (was called inside nested loop!)
    const files = await readdir(memDir, { recursive: true }) as string[];

    // Build file map for O(1) path lookups (was O(k) per lookup)
    const fileMap = new Map<string, string>();
    for (const file of files) {
      if (typeof file === 'string' && file.endsWith('.md')) {
        const id = basename(file, '.md');
        fileMap.set(id, join(memDir, file));
      }
    }

    // Find linked memories efficiently - O(n + m + k) total
    const seen = new Set<string>();
    for (const id of foundIds) {
      const neighbours = adjacencyMap.get(id);
      if (!neighbours) continue;

      for (const linkedId of neighbours) {
        if (seen.has(linkedId)) continue;
        if (!(linkedId.includes('learning') || linkedId.includes('decision'))) continue;

        const filePath = fileMap.get(linkedId);
        if (filePath) {
          linked.push(filePath);
          seen.add(linkedId);
          if (linked.length >= 3) break;
        }
      }
      if (linked.length >= 3) break;
    }
  } catch {
    // Ignore errors
  }

  return linked.slice(0, 3);
}

/**
 * Filter files by warning keywords
 */
async function filterByWarningKeywords(files: string[]): Promise<string[]> {
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
        const content = await readFile(f, 'utf-8');
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
    await log(ctx, `ℹ️ Memory check skipped: ${parsed.value}`);
    return null;
  }

  const topic = parsed.value;

  // Validate topic
  if (!validateTopic(topic)) {
    await log(ctx, `ℹ️ Memory check skipped: invalid topic extracted (raw: ${topic})`);
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

  await log(
    ctx,
    `[SEMANTIC] Search for: ${fileName} (${topic})
  Query: ${fileName} ${topic} gotcha warning
  Threshold: ${searchResult.threshold_used} | Mode: ${searchResult.index_status} | Time: ${searchResult.search_time_ms}ms
  Results (${searchResult.memories.length}):
${searchResult.memories.map((m) => `  - ${m.id} (score: ${String(m.score).slice(0, 5)})`).join('\n')}`
  );

  allFiles.push(...semanticFiles);

  // 2. Gotcha-named files
  if (await pathExists(projectMemDir)) {
    allFiles.push(...(await findGotchaNamedFiles(projectMemDir, topic)));
  }
  if (searchUserMem && (await pathExists(userMemDir))) {
    allFiles.push(...(await findGotchaNamedFiles(userMemDir, topic)));
  }

  // 3. Graph links
  const foundIds = searchResult.memories.map((m) => m.id);
  if (await pathExists(projectMemDir)) {
    allFiles.push(...(await findLinkedMemories(projectMemDir, foundIds)));
  }
  if (searchUserMem && (await pathExists(userMemDir))) {
    allFiles.push(...(await findLinkedMemories(userMemDir, foundIds)));
  }

  // Deduplicate and filter
  allFiles = [...new Set(allFiles)];
  const relevantFiles = await filterByWarningKeywords(allFiles);

  const scopeIndicator = searchUserMem ? ' (+user)' : '';

  if (relevantFiles.length === 0) {
    await log(ctx, `ℹ️ Topic: ${topic}${scopeIndicator} - no relevant gotchas in memory`);
    return null;
  }

  // Read and concatenate memory content
  let memoryContent = '';
  const sourceIds: string[] = [];

  for (const f of relevantFiles) {
    try {
      const content = await readFile(f, 'utf-8');
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
    await log(
      ctx,
      `ℹ️ Topic: ${topic}${scopeIndicator} - checked memory, no specific gotchas found
Sources checked:
${relevantFiles.map((f) => `  - ${basename(f)}`).join('\n')}`
    );
    return null;
  }

  // Check session cache for deduplication
  const cache = await createGotchaCache(projectDir, sessionId);
  const cacheKey = gotchaCacheKey(topic, cleanedSummary);

  if (cache.has(cacheKey)) {
    await log(ctx, `ℹ️ Topic: ${topic}${scopeIndicator} - gotcha already shown this session`);
    return null;
  }

  await cache.add(cacheKey);

  const reminder = `⚠️ GOTCHAS for ${topic}${scopeIndicator}: ${cleanedSummary}\n📄 Sources: ${sourceIds.join(', ')}`;

  await log(
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
  if (skipMatch && skipMatch[1]) {
    const reason = skipMatch[1].trim();
    await log(ctx, `ℹ️ Memory capture skipped: ${reason}`);
    return null;
  }

  // Extract suggestion
  const suggestMatch = response.match(/SUGGEST:\s*(.+)/i);
  if (!suggestMatch || !suggestMatch[1]) {
    return null;
  }

  const suggestion = suggestMatch[1].trim();
  const typeMatch = response.match(/TYPE:\s*(\w+)/i);
  const memoryType = typeMatch && typeMatch[1] ? typeMatch[1] : 'learning';

  const reminder = `⚠️ SYSTEM NOTICE: Evaluate memory capture (${memoryType}) before next action. ${suggestion}`;
  await log(ctx, reminder);

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
  const config = await loadConfig();
  if (!isToolEnabled(toolName, config, input.tool_input as Record<string, unknown>)) {
    return allow();
  }

  const ctx = await setupLogging(projectDir, sessionId, toolName);

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
