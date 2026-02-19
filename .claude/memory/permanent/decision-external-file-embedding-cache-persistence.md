---
id: decision-external-file-embedding-cache-persistence
title: External file indexing uses persistent embedding cache with content-hash invalidation
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-19T11:02:57.766Z"
updated: "2026-02-19T11:03:33.211Z"
tags:
  - external-module
  - embeddings
  - caching
  - architecture
  - project
---

Implemented external-file-indexer to load/save embedding cache files rather than creating empty caches each time. Uses content hashes to detect changed external files and only regenerates embeddings for modified content. Enables efficient re-indexing on every sync without recomputing all embeddings.
