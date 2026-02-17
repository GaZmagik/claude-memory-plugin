---
id: learning-hook-integration-for-agent-context-hookinput-extension-strategy
title: Hook integration for agent context - HookInput extension strategy
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-06T07:30:10.165Z"
updated: "2026-02-16T22:30:07.412Z"
tags:
  - agent-scoping
  - hook-integration
  - performance-budget
  - project
---

Documented HookInput interface extension with optional agent_context field. Performance budget: 36ms total within 50ms limit. Hook event behaviour matrix shows which events receive agent context. Includes gotcha injection priority order and deduplication rules. Backward compatibility maintained via optional field and graceful degradation.
