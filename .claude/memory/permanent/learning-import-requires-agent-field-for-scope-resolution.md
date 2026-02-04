---
type: learning
title: Import operation requires agent field for agent-scoped writes
tags: [agent-scopes, import, copy, write-operation]
scope: agent-project
---

When importMemories() calls writeMemory() for agent-scoped memories, it must pass the agent name explicitly. WriteMemory requires the 'agent' field to properly resolve paths for AgentProject and AgentGlobal scopes, even when basePath already points to the agent directory. This was discovered during copyAgent() test fixes when imports were failing silently with "failed: 1" counts.
