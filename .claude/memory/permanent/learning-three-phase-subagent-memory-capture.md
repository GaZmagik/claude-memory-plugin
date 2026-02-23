---
id: learning-three-phase-subagent-memory-capture
title: Three-Phase Subagent Memory Capture Pattern
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-23T19:13:06.057Z"
updated: "2026-02-23T19:13:36.836Z"
tags:
  - subagent
  - memory
  - hooks
  - phases
  - pattern
  - project
---

SubagentStop writes entry, PostToolUse claims one atomically, SessionEnd sweeps remaining. This phase-based approach provides proper isolation and cleanup for parallel subagent workflows without requiring shared state synchronisation.
