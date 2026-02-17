---
id: learning-import-requires-agent-field-for-scope-resolution
title: Import operation requires agent field for agent-scoped writes
type: learning
scope: agent-project
project: claude-memory-plugin
updated: "2026-02-16T22:30:07.574Z"
tags:
  - agent-scopes
  - import
  - copy
  - write-operation
---

When importMemories() calls writeMemory() for agent-scoped memories, it must pass the agent name explicitly. WriteMemory requires the 'agent' field to properly resolve paths for AgentProject and AgentGlobal scopes, even when basePath already points to the agent directory. This was discovered during copyAgent() test fixes when imports were failing silently with "failed: 1" counts.
