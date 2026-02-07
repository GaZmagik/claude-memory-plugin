---
id: decision-meetings-orchestration-belongs-in-accord-not-memory-plugin
title: Meetings Orchestration Moved to Accord Plugin
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-01T23:02:42.126Z"
updated: "2026-02-01T23:03:09.044Z"
tags:
  - architecture
  - plugin-design
  - separation-of-concerns
  - project
---

Architectural decision: meeting orchestration responsibility moves from memory plugin to Accord plugin. Meetings are coordination layer (Accord's responsibility), not knowledge persistence (memory plugin). Memory plugin receives promoted outputs (decisions/learnings). This enables clean separation of concerns and allows Accord v1.0.0 to ship independently.
