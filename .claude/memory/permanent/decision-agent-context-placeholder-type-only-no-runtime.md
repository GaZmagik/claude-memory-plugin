---
id: decision-agent-context-placeholder-type-only-no-runtime
title: AgentContext field added to HookInput as compile-clean placeholder
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-06T08:03:09.971Z"
updated: "2026-02-16T22:30:07.426Z"
tags:
  - phase-f
  - hooks
  - agent-context
  - architecture
  - backward-compatibility
  - project
---

Added optional agent_context field to HookInput (hooks/src/core/types.ts) as type-level placeholder. Field has NO runtime behaviour, NO default values, NO population logic — it exists purely to validate the serialisation chain and enable future agent context injection without breaking changes. Injection mechanism (session cache vs env var vs stdin mutation) not yet decided.
