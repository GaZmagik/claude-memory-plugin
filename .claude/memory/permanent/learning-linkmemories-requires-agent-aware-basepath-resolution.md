---
id: learning-linkmemories-requires-agent-aware-basepath-resolution
title: linkMemories requires agent-aware basePath resolution
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-05T23:24:57.593Z"
updated: "2026-02-16T22:30:07.420Z"
tags:
  - phase-e
  - agent-scoping
  - graph-operations
  - project
---

linkMemories function wasn't respecting agent context - needed to add resolveAgentScopePath import and use it to resolve proper agent-specific graph location. Without this, links created with agent parameter were being saved to project graph instead of agent graph.
