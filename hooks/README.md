# Memory Plugin Hooks

Hook scripts that integrate with Claude Code's lifecycle events to provide automatic memory injection, gotcha warnings, and session management.

## Architecture

```
hooks/
├── hooks.json                    # Hook registration manifest
├── post-tool-use/                # After tool execution
│   └── memory-context.ts         # Inject memory context after tool use
├── pre-compact/                  # Before context compaction
│   └── memory-capture.ts         # Capture learnings before compaction
├── pre-tool-use/                 # Before tool execution
│   ├── enforce-memory-cli.ts     # Enforce memory CLI usage for Bash
│   └── protect-memory-directory.ts # Protect .claude/memory from direct edits
├── session-end/                  # Session teardown
│   └── memory-cleanup.ts         # Clean up session state
├── session-start/                # Session initialisation
│   ├── check-bun-installed.mjs   # Verify bun runtime available
│   ├── ollama-prewarm.ts         # Pre-warm Ollama for semantic search
│   └── start-memory-index.ts     # Load memory index at startup
├── user-prompt-submit/           # User sends a message
│   ├── memory-context.ts         # Inject relevant memory context
│   └── memory-reminders.ts       # Surface gotcha reminders
└── src/                          # Shared source modules
    ├── core/                     # Core hook infrastructure
    │   ├── types.ts              # HookInput, HookOutput, AgentContext
    │   ├── stdin.ts              # Parse hook input from stdin
    │   ├── errors.ts             # Error types
    │   ├── error-handler.ts      # Centralised error handling
    │   ├── constants.ts          # Shared constants
    │   ├── hook-logger.ts        # Hook logging utilities
    │   └── subprocess.ts         # Subprocess management
    ├── memory/                   # Memory-specific logic
    │   ├── directory-protection.ts
    │   ├── enhanced-injector.ts
    │   ├── gotcha-injector.ts
    │   ├── pattern-matcher.ts
    │   ├── relevance-scorer.ts
    │   └── topic-classifier.ts
    ├── services/                 # External service integration
    │   ├── ollama.ts
    │   └── semantic-search.ts
    ├── session/                  # Session management
    │   ├── extract-context.ts
    │   ├── fork-detection.ts
    │   ├── session-cache.ts
    │   ├── session-state.ts
    │   └── spawn-session.ts
    ├── settings/                 # Configuration
    │   ├── injection-settings.ts
    │   └── plugin-settings.ts
    ├── types/                    # Additional type definitions
    └── utils/                    # Shared utilities
        └── hash-utils.ts
```

## Hook Events

| Event | Trigger | Timeout | Purpose |
|-------|---------|---------|---------|
| `SessionStart` | Session begins | 30s | Load index, pre-warm Ollama |
| `UserPromptSubmit` | User sends message | 5-10s | Inject reminders and context |
| `PreToolUse` | Before tool runs | 5s | Protect memory dir, enforce CLI |
| `PostToolUse` | After tool runs | 30s | Inject memory context |
| `PostToolUse:Task` | After agent completes | 15s | Agent retrospective prompt |
| `PreCompact` | Before compaction | 90s | Capture memories from transcript |
| `SessionEnd` | Session ends | 30s | Clean up session state |

## Type Definitions

### HookInput

All hooks receive a JSON object via stdin conforming to the `HookInput` interface (see `src/core/types.ts`).

```typescript
interface HookInput {
  hook_event_name: string;      // e.g. 'PostToolUse:Bash'
  tool_name?: string;           // e.g. 'Bash', 'Write', 'Read'
  tool_input?: { ... };         // Tool-specific parameters
  prompt?: string;              // User prompt (UserPromptSubmit only)
  session_id?: string;          // Current session ID
  cwd?: string;                 // Working directory
  permission_mode?: string;     // 'default' or 'bypassPermissions'
  transcript_path?: string;     // Path to session transcript
  trigger?: string;             // Hook trigger type (PreCompact)
  reason?: string;              // Session end reason (SessionEnd)
  agent_context?: AgentContext;  // Agent identity (placeholder — see below)
}
```

### HookOutput

Hooks communicate back via stdout JSON:

```typescript
interface HookOutput {
  hookSpecificOutput?: {
    hookEventName: string;
    additionalContext?: string;
  };
}
```

### Exit Codes

| Code | Meaning | Behaviour |
|------|---------|-----------|
| `0` | Allow | Tool proceeds normally |
| `1` | Warn | Tool proceeds, warning shown |
| `2` | Block | Tool execution prevented |

## Agent Context (Placeholder)

> **Status**: Reserved for future implementation. The `agent_context` field exists on `HookInput` but is **not yet populated by any hook event dispatcher**.

### Overview

The `AgentContext` interface enables agent-scoped memory operations within hooks. When populated in a future release, it will identify which Claude Code agent triggered the hook event, enabling:

- Agent-scoped gotcha injection (agent gotchas prioritised over project gotchas)
- Agent-scoped memory context (scoped to agent's memory store)
- Session-level agent identity caching

### Interface

```typescript
interface AgentContext {
  /** Sanitised agent name (lowercase alphanumeric + hyphens, max 64 chars) */
  agent_name: string;
  /** How the agent identity was detected */
  source: 'flag' | 'hook-metadata' | 'env' | 'marker' | 'plugin-config';
  /** Optional agent type (e.g. 'claude-memory-plugin:recall') */
  agent_type?: string;
  /** Optional parent session ID for sub-agent tracing */
  parent_session_id?: string;
}
```

### Identity Detection Priority

When multiple identity sources are available, resolution follows this priority order:

```
1. --agent CLI flag        (explicit, highest trust)
2. Hook metadata           (from Claude Code's agent registry)
3. CLAUDE_AGENT_NAME env   (environment variable)
4. Invocation marker       (<!-- agent:name --> in prompt)
5. Plugin config mapping   (static configuration)
6. No agent                (fall back to default scope)
```

### Hook Event Availability Matrix

Not all hook events will provide agent context. When implemented:

| Hook Event | Agent Context Source | Behaviour |
|------------|---------------------|-----------|
| `SessionStart` | Env var or plugin config | Load agent gotchas for initial injection |
| `UserPromptSubmit` | Marker parsing or env var | Cache identity; inject agent context |
| `PreToolUse` | Session cache or env var | Validate agent scope for writes |
| `PostToolUse` | Session cache or env var | Enrich context with agent gotchas |
| `PreCompact` | Session cache | Include agent context in preservation |
| `SessionEnd` | Session cache | Clear agent session cache |
| `SubagentStop` | Limited (see note) | Agent type only, not memory agent name |

**SubagentStop Note**: This event receives minimal context — no `agent_name` or `session_id`. Use `PostToolUse` with Task matcher instead. See memory: `decision-subagentstop-hook-receives-insufficient-context-use-posttooluse-instead`.

### PostToolUse:Task - Agent Retrospective (v1.4.0+)

**Purpose**: Prompt agents to capture learnings when completing work

**Triggers**: After Task tool execution (subagent completion)

**Logic**:
1. Detect agent identity from multiple sources (--agent flag, CLAUDE_AGENT_NAME env var, future agent_context)
2. Classify work significance (trivial vs meaningful) using keyword heuristics
3. Inject retrospective guidance if work is meaningful
4. Direct agents to `/commands/agent-commit.md` for guided workflow

**Agent Detection Priority**:
1. `--agent` flag in task args (highest trust)
2. `CLAUDE_AGENT_NAME` environment variable
3. `agent_context` field (placeholder for future)

**Work Classification**:
- **Meaningful**: Contains keywords like "implement", "refactor", "debug", "design", "fix bug"
- **Trivial**: Short prompts (<50 chars), generic tasks, or routine operations

**Performance**: <25ms execution with early exit if no agent detected

**Implementation**: `hooks/post-tool-use/agent-retrospective.ts`

**Related Components**:
- `hooks/src/agent/detect-agent.ts` - Multi-source agent identity resolution (19 tests)
- `hooks/src/agent/work-classifier.ts` - Work significance classification (31 tests)
- `/commands/agent-commit.md` - Guided memory capture workflow for agents

**Configuration**: See `hooks.json` PostToolUse:Task matcher

### Gotcha Injection Priority

When agent context is active, gotcha injection follows this priority (highest first):

```
1. Agent scope    .claude/memory/agents/{name}/permanent/gotcha-*.md
2. Project scope  .claude/memory/permanent/gotcha-*.md
3. Local scope    .claude/memory/local/permanent/gotcha-*.md
4. Global scope   ~/.claude/memory/permanent/gotcha-*.md
```

Deduplication: if the same gotcha ID exists in both agent and project scope, only the agent-scoped version is injected.

When no agent is identified, the system behaves identically to pre-agent behaviour — only project, local, and global gotchas are injected.

### Consuming Agent Context in Hooks

When implementing a hook that uses agent context:

```typescript
import { parseHookInput } from '../src/core/stdin.js';
import type { HookInput } from '../src/core/types.js';

const input = await parseHookInput(process.stdin);
if (!input) process.exit(0);

const hookInput = input as HookInput;

// Always check — agent_context may be undefined
if (hookInput.agent_context) {
  const { agent_name, source } = hookInput.agent_context;
  // Use agent-scoped operations
  console.error(`Agent detected: ${agent_name} (via ${source})`);
} else {
  // Default scope — no agent operations
}
```

**Critical**: Always handle `agent_context` being `undefined`. Older hook scripts, forked sessions, and some hook events will never populate this field.

## Performance Constraints

All hooks must complete within their configured timeout. The general budget for agent context operations:

| Operation | Budget | Notes |
|-----------|--------|-------|
| Agent identity resolution | <5ms | Env var read or field access |
| Agent name sanitisation | <1ms | Pure string transform |
| Scope path resolution | <5ms | Path join + git detection (cached) |
| Agent gotcha loading | <20ms | Async file read from agent scope |
| Session cache read/write | <5ms | Small JSON file, async I/O |
| **Total agent overhead** | **<36ms** | **Within 50ms budget** |

**Critical**: All file I/O in hooks MUST be asynchronous. Synchronous operations block the event loop and break the 50ms budget. See memory: `gotcha-gotcha-sync-file-io-in-hooks-blocks-event-loop-breaks-50ms-budget`.

## Error Handling

| Scenario | Behaviour | Rationale |
|----------|-----------|-----------|
| Agent name fails sanitisation | Log warning, proceed without agent context | Don't block operations for bad input |
| Agent directory doesn't exist | Skip agent operations, default scope | Auto-creation is a write-time concern |
| Agent gotcha file malformed | Skip that gotcha, log warning | Partial results better than crash |
| Session cache corrupted | Re-resolve from source | Self-healing on next event |
| Scope path resolution fails | Fall back to default scope | Graceful degradation |
| Budget exceeded (>50ms) | Return partial results | Performance over completeness |

Hook scripts should always log errors via `console.error` (not stdout — that's reserved for `HookOutput` JSON).

## Development

### Running Tests

```bash
# All hook tests
npx vitest run hooks/

# Specific module
npx vitest run hooks/src/core/types.spec.ts
npx vitest run hooks/src/core/stdin.spec.ts

# Watch mode
npx vitest watch hooks/
```

### Adding a New Hook

1. Create the hook script in the appropriate event directory
2. Create a co-located `.spec.ts` test file
3. Register in `hooks.json` with appropriate matcher and timeout
4. Import shared utilities from `src/core/` and `src/memory/`

### Writing Tests

Hook tests use vitest. Test files are co-located with source (e.g. `stdin.spec.ts` alongside `stdin.ts`). Use `Readable.from()` to mock stdin:

```typescript
import { Readable } from 'stream';
import { parseHookInput } from './stdin.js';
import type { HookInput } from './types.js';

const input: HookInput = {
  hook_event_name: 'PostToolUse:Bash',
  session_id: 'test',
  cwd: '/project',
};
const stream = Readable.from([JSON.stringify(input)]);
const result = await parseHookInput(stream);
```

## Future Extensions

These are documented for future implementers but **not** implemented:

1. **Agent permission model** — Hook metadata could include agent permissions (read-only, read-write, admin)
2. **Agent memory quotas** — Limit memories per agent to prevent runaway agents
3. **Agent audit trail** — Log which agent wrote which memories
4. **Cross-agent gotcha sharing** — Agent A's gotchas visible to Agent B if configured
5. **Agent lifecycle hooks** — `AgentStart`/`AgentStop` events for agent-specific init/cleanup
