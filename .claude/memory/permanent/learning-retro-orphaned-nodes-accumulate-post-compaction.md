---
id: learning-retro-orphaned-nodes-accumulate-post-compaction
title: "retro: Orphaned Nodes Accumulate Post-Compaction Without Linking Step"
type: learning
scope: project
project: claude-memory-plugin
updated: "2026-01-13T19:02:56.189Z"
tags:
  - retrospective
  - process
  - memory-graph
  - graph-health
links:
  - learning-retro-memory-linking-post-compaction
  - learning-semantic-search-embedding-caching-success
  - decision-session-continuity-strategy
---

Post-compaction, memory health shows 8 orphaned nodes (connectivity 84.6%, down from ideal ~95%+).
Most recent learnings are unlinked:
- 3 retrospective learnings from pre-compact hook
- 1 new learning just created about the linking issue itself
- 4 older learnings that have been sitting orphaned

This is a **process problem**: orphaned nodes reduce graph discoverability and contextual relevance.
The memory-curator agent correctly identifies orphans but doesn't auto-link them.

Consider: post-restoration linking step that creates edges based on tag similarity or semantic search.
