/**
 * Constants for Claude Code Hooks
 *
 * Centralised definitions for hook events, tools, paths, and thresholds.
 */

/**
 * All supported hook event types
 */
export const HOOK_EVENTS = [
  'PreToolUse',
  'PostToolUse',
  'UserPromptSubmit',
  'PreCompact',
  'SessionStart',
  'SessionEnd',
  'Stop',
  'SubagentStop',
] as const;

export type HookEventName = (typeof HOOK_EVENTS)[number];

/**
 * All supported tool names
 */
export const TOOLS = [
  'Bash',
  'Read',
  'Write',
  'Edit',
  'MultiEdit',
  'Glob',
  'Grep',
  'WebFetch',
  'WebSearch',
  'TodoWrite',
  'Task',
  'TaskOutput',
  'Skill',
  'SlashCommand',
  'AskUserQuestion',
  'NotebookEdit',
  'KillShell',
  'EnterPlanMode',
  'ExitPlanMode',
] as const;

export type ToolName = (typeof TOOLS)[number];

/**
 * Protected directory patterns (paths that should not be modified)
 */
export const PROTECTED_PATHS = {
  MEMORY_DIRECTORY: '.claude/memory/',
  SPECIFY_DIRECTORY: '.specify/',
  APPROVALS_DIRECTORY: '.claude/approvals/',
  GRAPH_JSON: '.claude/memory/graph.json',
  INDEX_JSON: '.claude/memory/index.json',
} as const;

/**
 * Protected file patterns (specific files that should not be deleted/emptied)
 */
export const PROTECTED_FILES = [
  'spec.md',
  'plan.md',
  'tasks.md',
  'constitution.md',
] as const;

/**
 * Performance thresholds in milliseconds
 */
export const PERFORMANCE = {
  /** Maximum startup time for simple hooks */
  SIMPLE_HOOK_MS: 100,
  /** Maximum response time for Ollama-powered hooks */
  OLLAMA_HOOK_MS: 200,
  /** Maximum response time for indexed semantic search */
  SEMANTIC_INDEXED_MS: 500,
  /** Maximum response time for fallback semantic search */
  SEMANTIC_FALLBACK_MS: 2000,
  /** Ollama API timeout */
  OLLAMA_TIMEOUT_MS: 10000,
} as const;

/**
 * Ollama model configurations
 */
export const OLLAMA_MODELS = {
  /** Model for chat/classification tasks */
  CHAT: 'gemma3:4b',
  /** Model for embedding generation */
  EMBEDDING: 'embeddinggemma:latest',
} as const;

/**
 * Cache directories
 */
export const CACHE_PATHS = {
  SESSIONS: '.claude/cache/sessions/',
  SEMANTIC_INDEX: '.claude/cache/semantic-index/',
} as const;

/**
 * Exit code meanings
 */
export const EXIT_CODES = {
  ALLOW: 0,
  WARN: 1,
  BLOCK: 2,
} as const;

/**
 * Dangerous bash command patterns
 */
export const DANGEROUS_COMMANDS = [
  'rm -rf /',
  'rm -rf ~',
  'sudo rm',
  'format',
  'fdisk',
  'mkfs',
  ':(){:|:&};:',
  'dd if=/dev/zero',
  'chmod -R 777 /',
] as const;

/**
 * Git branch restrictions
 */
export const GIT_PROTECTED_BRANCHES = ['main', 'master'] as const;
