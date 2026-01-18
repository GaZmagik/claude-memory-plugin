---
id: decision-embedding-context-limit-solution-for-memory-refresh-embeddings
title: Embedding context limit solution for memory refresh --embeddings
type: decision
scope: project
created: "2026-01-16T18:18:23.348Z"
updated: "2026-01-16T18:18:23.348Z"
tags:
  - promoted-from-think
  - embeddings
  - batch-refresh
  - project
---

DECISION: Apply existing truncateForEmbedding() function during batch refresh operations. Rationale: (1) Empirical data shows 96% of memories fit within limit, (2) The 4% edge cases are multi-expert deliberations found by title/links not semantic search, (3) Individual writes already use this truncation successfully, (4) Implementation cost: 10 minutes vs hours for chunking/streaming, (5) Alternative 'suggest-links' command already provides semantic discovery without batch refresh. Implementation: Add truncation call in refresh command before generating embeddings, add warning log when truncation occurs, document the 6000 char limit in command help text.

_Deliberation: `thought-20260116-180811237`_
