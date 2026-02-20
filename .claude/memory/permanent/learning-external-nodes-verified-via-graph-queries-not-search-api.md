---
id: learning-external-nodes-verified-via-graph-queries-not-search-api
title: External nodes verified via graph queries, not search API
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-20T11:52:32.481Z"
updated: "2026-02-20T11:53:04.075Z"
tags:
  - project
---

External files (CLAUDE.md, rules, MEMORY.md) indexed via sync should be verified through loadIndex() + getMemories() graph queries, not the search API which doesn't yet support externalPath. Tests verify discovery, indexing, and graph structure. Sync reports changes via externalNodesAdded/Removed arrays (string IDs).
