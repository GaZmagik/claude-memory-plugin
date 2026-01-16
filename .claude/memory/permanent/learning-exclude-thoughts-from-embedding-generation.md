---
id: learning-exclude-thoughts-from-embedding-generation
title: Exclude thoughts from embedding generation
type: learning
scope: project
created: "2026-01-16T18:24:45.230Z"
updated: "2026-01-16T18:24:45.230Z"
tags:
  - think
  - embeddings
  - memory-system
  - performance
  - project
---

Temporary memories (thoughts) are now excluded from embedding generation in refresh --embeddings and suggest-links. Thoughts are ephemeral, often large (with agent outputs), and not useful for semantic search. Changes: (1) maintenance.ts - skip thoughts in batch embedding loop, (2) suggest-links.ts - filter memoryIds and embeddings map. Existing thought embeddings should be cleaned from embeddings.json with jq filter.
