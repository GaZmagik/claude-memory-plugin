---
id: artifact-subagent-registry-utility-pattern
title: "Subagent Registry: Utility for Temp File Management & Race Prevention"
type: artifact
scope: project
project: claude-memory-plugin
created: "2026-02-23T18:27:50.505Z"
updated: "2026-02-23T18:28:05.336Z"
tags:
  - patterns
  - subagents
  - race-prevention
  - project
---

Planned utility module (hooks/src/agent/subagent-registry.ts) for centralized subagent ID temp file management. Exports writeSubagentEntry() for SubagentStop, findAndClaimSubagent() for PostToolUse:Task scan-and-claim, cleanup() for orphans. Prevents races and zombie files. Implementation: Tasks 5-8.
