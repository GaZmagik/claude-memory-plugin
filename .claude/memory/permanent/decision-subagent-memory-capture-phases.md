---
id: decision-subagent-memory-capture-phases
title: "Subagent Memory Capture: Phase 2 (env vars + temp files) vs Phase 3 (hook metadata)"
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-23T18:27:34.776Z"
updated: "2026-02-23T18:28:05.412Z"
tags:
  - architecture
  - subagents
  - memory-capture
  - project
---

Phase 2 implemented: automatic memory capture via PostToolUse:Task (Task subagents) and SessionEnd (--agent sessions) using env vars + temp files. Phase 3 (future) would use Claude Code hook metadata. Current requires explicit env var setup (CLAUDE_AGENT_NAME=python-expert). Trade-off: works now, but adds friction.
