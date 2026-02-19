---
id: decision-context-file-graph-nodes-key-decisions
title: Context-file graph nodes — key decisions
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-18T21:37:35.296Z"
updated: "2026-02-19T06:33:18.796Z"
tags:
  - promoted-from-think
  - project
---

# Context-file graph nodes — key decisions

Introduce MemoryType.ContextFile with new context/ module. Extend sync/rebuild to discover context files. Add read-only write guards. New index-context CLI command. 5-phase implementation: types → discovery/indexer → sync integration → mermaid/guards → CLI wiring.

_Deliberation: `thought-20260218-213709243`_
