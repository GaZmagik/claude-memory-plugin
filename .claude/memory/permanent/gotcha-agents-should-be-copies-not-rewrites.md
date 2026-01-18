---
id: gotcha-agents-should-be-copies-not-rewrites
title: Plugin agents must copy user-level versions, not simplified rewrites
type: gotcha
scope: local
project: claude-memory-plugin
created: "2026-01-11T13:58:32Z"
updated: "2026-01-13T18:49:49.820Z"
tags:
  - plugin
  - agents
  - gotcha
  - maintenance
links:
  - learning-memory-context-hook-graceful-search-degradation
  - learning-memory-context-hook-graceful-search-degradation
  - artifact-gotcha-prevention-checklist
---

## Issue

Plugin's agents directory had simplified/rewritten versions of memory-recall and memory-curator agents:
- Missing YAML frontmatter (name, version, model, tools, color)
- Reduced instructions (1/10th of content)
- Lost resumable session support and advanced workflows documented in user-level versions

## Root Cause

False economy - thought "plugin version could be minimal". Wrong: agents are plugin's public interface. They must be feature-complete.

## Solution

Copy user-level agents directly:
```bash
cp ~/.claude/agents/memory-curator.md ./agents/memory-curator.md
cp ~/.claude/agents/memory-recall.md ./agents/memory-recall.md
```

Maintain as references to user-level, not independently.

## Lesson

For distributed plugin artifacts (agents, commands, hooks):
- Copy authoritative versions if they must exist in plugin
- Don't rewrite "to fit the repo"
- Document version in comments if needed
- Consider symlinking if repo supports it
