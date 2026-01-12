---
id: decision-subagentstop-hook-receives-insufficient-context-use-posttooluse-instead
title: SubagentStop hook receives insufficient context - use PostToolUse instead
type: decision
scope: project
project: claude-memory-plugin
created: "2026-01-12T20:31:36.909Z"
updated: "2026-01-12T22:02:47.180Z"
tags:
  - hooks
  - claude-code
  - gotcha
  - project
---

# SubagentStop Hook Input Limitation

## Problem

SubagentStop hooks in Claude Code receive minimal input:
```typescript
type SubagentStopHookInput = BaseHookInput & {
  hook_event_name: 'SubagentStop';
  stop_hook_active: boolean;
}
```

They do NOT receive:
- `subagent_type` (what kind of agent completed)
- `session_id` (which session triggered this)
- `agent_id` (specific agent identifier)

This makes it impossible to identify which restoration agent (memory-recall, memory-curator, check-gotchas) completed, rendering the hook useless for session restore approval tracking.

## Solution

Convert to **PostToolUse hook with Task matcher** instead. PostToolUse receives full tool input including `tool_input.subagent_type`, allowing identification of the agent.

## References

- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks)
- See: `~/.claude/hooks/ts/post-tool-use/session-restore-approval.ts` for working implementation
