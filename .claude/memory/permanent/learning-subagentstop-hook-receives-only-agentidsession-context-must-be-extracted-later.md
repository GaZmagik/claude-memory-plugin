---
id: learning-subagentstop-hook-receives-only-agentidsession-context-must-be-extracted-later
title: SubagentStop Hook Receives Only agent_id—Session Context Must Be Extracted Later
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-23T18:27:40.579Z"
updated: "2026-02-23T18:28:04.205Z"
tags:
  - hooks
  - subagents
  - session-context
  - project
---

SubagentStop hook payload contains only agent_id, not transcript. Immediate memory capture at hook time is impossible. Solution: PostToolUse:Task reads session file from .claude/sessions/ and extracts context via extract-context.ts before spawning agent-commit. Two-stage capture (hook lookup) vs single-stage.
