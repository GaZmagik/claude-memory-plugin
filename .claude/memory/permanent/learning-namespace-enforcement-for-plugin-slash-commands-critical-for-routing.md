---
id: learning-namespace-enforcement-for-plugin-slash-commands-critical-for-routing
title: Namespace enforcement for plugin slash commands critical for routing
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-12T21:05:24.573Z"
updated: "2026-01-16T23:10:42.607Z"
tags:
  - plugin-architecture
  - slash-commands
  - retro
  - project
---

# Namespace Enforcement for Plugin Slash Commands

## Insight
Plugin commands must use the `/plugin:command` namespace format to route correctly through Claude Code's slash command dispatcher. Using `/command` without namespace prefix causes commands to be treated as global system commands, not plugin commands.

## Discovery
Found that memory-capture and memory-cleanup hooks were invoking `/memory-commit` instead of `/memory:memory-commit`. This caused command routing failures when the hooks spawned background sessions.

## Pattern
All plugin commands require the namespace prefix:
- ✅ `/memory:memory-commit` → Routes to plugin command
- ❌ `/memory-commit` → Not found (tries global namespace)
- ✅ `/memory:check-gotchas` → Routes correctly
- ❌ `/check-gotchas` → Not found

## Action
When creating plugin commands or updating references in hooks/agents/commands: Always verify the `/plugin-name:command-name` format is used consistently across all invocation sites.

## Files Affected
- hooks/pre-compact/memory-capture.ts
- hooks/session-end/memory-cleanup.ts
- agents/memory-recall.md
- agents/memory-curator.md
- commands/*.md reference files
