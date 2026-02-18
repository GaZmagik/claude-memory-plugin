---
id: learning-posttoolusetask-hook-preferred-over-subagentstop-for-agent-context-capture
title: PostToolUse:Task hook preferred over SubagentStop for agent context capture
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-17T00:27:17.859Z"
updated: "2026-02-17T08:02:05.358Z"
tags:
  - hooks
  - agent
  - architecture
  - decision-rationale
  - project
---

PostToolUse:Task hook receives sufficient context for agent retrospective capture (agent identity, task outcome, tool results). SubagentStop hook was rejected because it receives insufficient context. PostToolUse allows detecting agent identity via multiple sources: CLI flags, task context, prompt markers, and environment variables with fallback priority chain.
