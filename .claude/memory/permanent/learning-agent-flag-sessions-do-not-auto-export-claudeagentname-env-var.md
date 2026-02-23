---
id: learning-agent-flag-sessions-do-not-auto-export-claudeagentname-env-var
title: "--agent Flag Sessions Do Not Auto-Export CLAUDE_AGENT_NAME Env Var"
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-23T18:27:47.523Z"
updated: "2026-02-23T18:28:04.475Z"
tags:
  - environment
  - agents
  - session-end
  - project
---

Claude Code --agent flag sets agent system prompt internally but does NOT export CLAUDE_AGENT_NAME to environment. SessionEnd hook cannot detect agent sessions without env var. Workarounds: (1) set env var before launch, (2) wrapper script, (3) SessionStart hook. Phase 3 fix: Claude Code exposes agent_context.agent_name in SessionEnd payload.
