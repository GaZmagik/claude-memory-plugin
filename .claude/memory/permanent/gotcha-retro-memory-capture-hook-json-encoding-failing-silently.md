---
id: gotcha-retro-memory-capture-hook-json-encoding-failing-silently
title: Retro - Memory-capture hook JSON encoding failing silently
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-06T01:20:36.440Z"
updated: "2026-02-16T22:30:07.467Z"
tags:
  - retrospective
  - process
  - hooks
  - memory-system
  - project
severity: high
---

The memory-capture hook runs after compaction but its JSON encoding fails (logs show status instead of JSON structure). This loses retrospective insights that should be saved to permanent memory. Workaround: Manual /session-restore invokes memory-recall agent which queries memory system directly. Root cause: Likely unhandled exception in hook's JSON.stringify or file write. Needs debugging of ~/.claude/hooks/post-compact/memory-capture.ts — check error handling.
