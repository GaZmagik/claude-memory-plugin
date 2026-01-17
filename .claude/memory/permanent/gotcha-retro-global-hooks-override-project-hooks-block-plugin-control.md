---
id: gotcha-retro-global-hooks-override-project-hooks-block-plugin-control
title: Retro - Global hooks override project hooks block plugin control
type: gotcha
scope: project
created: "2026-01-17T13:36:40.529Z"
updated: "2026-01-17T13:41:35.000Z"
tags:
  - retrospective
  - hooks
  - architecture
  - plugin-design
  - project
severity: high
---

## Original Issue

Session discovered that project-local PreCompact hooks were being ignored. Global `~/.claude/settings.json` pointed to `~/.claude/hooks/ts/session/pre-compact-memory.ts`, which prevented plugins from registering their own PreCompact hooks. This blocked the plugin from controlling its memory capture workflow.

## Root Cause

Misunderstanding of hook architecture layering. The assumption was that project-local hooks should override global hooks, but Claude Code's design uses a **layered execution model**:

1. **Global hooks first** (framework-level, from ~/.claude/settings.json)
2. **Project-local hooks second** (plugin-specific, from .claude/hooks/)

Both layers execute in sequence - they don't override each other.

## Resolution (IMPLEMENTED)

Changed from fighting the architecture to working within it:

**Architecture Clarification:**
- Global hooks (~/.claude/settings.json) contain framework-level hooks that execute first
- Plugins register project-local hooks in hooks/ subdirectories (post-tool-use/, user-prompt-submit/)
- Plugin hooks execute in sequence AFTER global hooks complete
- This separation is intentional: framework security guarantees first, then plugin customization

**Solution Applied:**
- Registered project-local hook in `hooks/post-tool-use/memory-context.ts`
- Plugin now controls memory capture workflow via PostToolUse and UserPromptSubmit phases
- Global PreCompact hooks and plugin PostToolUse hooks coexist without conflict
- Both layers serve their purpose: framework lifecycle + plugin augmentation

## Key Lesson

**Don't fight the architecture - work within it.**

Hook execution is layered by design. When you think a layer is "blocking" you, it usually means:
1. You're trying to use the wrong hook phase
2. You need to understand the intended layering
3. The architecture provides the flexibility you need - in a different phase

For plugin development: If you need to control a workflow, check if there's a later hook phase (PostToolUse, UserPromptSubmit, etc.) where your hook will execute AFTER the earlier phases complete.

## Applies To

Any plugin development. Understand hook layering before trying to override framework behaviour. Always check the [hook execution order documentation](https://claude.com) for your Claude Code version.
