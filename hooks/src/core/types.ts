/**
 * Claude Code Hook Type Definitions
 *
 * These types define the JSON contract between Claude Code and hook scripts.
 */

/**
 * Input received by hooks via stdin
 */
export interface HookInput {
  /** The hook event type (PreToolUse, PostToolUse, UserPromptSubmit, etc.) */
  hook_event_name: string;
  /** The tool being invoked (Bash, Write, Edit, etc.) - only for PreToolUse/PostToolUse */
  tool_name?: string;
  /** Tool-specific input parameters - only for PreToolUse/PostToolUse */
  tool_input?: {
    file_path?: string;
    command?: string;
    content?: string;
    old_string?: string;
    new_string?: string;
    [key: string]: unknown;
  };
  /** User's prompt text - only for UserPromptSubmit */
  prompt?: string;
  /** Unique identifier for this tool invocation */
  tool_use_id?: string;
  /** Current session identifier */
  session_id?: string;
  /** Current working directory */
  cwd?: string;
  /** Permission mode - "default" indicates a forked session, "bypassPermissions" is normal */
  permission_mode?: 'default' | 'bypassPermissions';
  /** Path to session transcript file */
  transcript_path?: string;
  /** Hook trigger type (e.g., 'auto', 'manual') - used in PreCompact */
  trigger?: string;
  /** Reason for session end (e.g., 'clear', 'exit') - used in SessionEnd */
  reason?: string;
}

/**
 * Output format for hooks that need to communicate back to Claude
 */
export interface HookOutput {
  hookSpecificOutput?: {
    hookEventName: string;
    additionalContext?: string;
  };
}

/**
 * Exit codes for hooks:
 * - 0: Allow the tool to proceed
 * - 1: Warn but allow (soft failure)
 * - 2: Block the tool (hard failure)
 */
export type ExitCode = 0 | 1 | 2;

export const EXIT_ALLOW: ExitCode = 0;
export const EXIT_WARN: ExitCode = 1;
export const EXIT_BLOCK: ExitCode = 2;
