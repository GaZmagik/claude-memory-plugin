---
id: gotcha-retro-refresh-embeddings-flag-incomplete-needs-debugging
title: Retro - Refresh --embeddings flag incomplete, needs debugging
type: gotcha
scope: project
created: "2026-01-16T18:38:07.284Z"
updated: "2026-01-16T18:38:07.284Z"
tags:
  - retrospective
  - embedding
  - memory-system
  - project
  - resolved
severity: low
---

INVESTIGATION RESOLVED: The `memory refresh project --embeddings` command was failing with 'Ollama API error: Internal Server Error' because memory content exceeded the embedding model context length (6000 chars for embeddinggemma). Root cause identified and solution implemented.

SOLUTION:
1. Apply `truncateForEmbedding()` function during batch refresh operations
2. Truncate content to 6000 chars at word boundaries before sending to Ollama
3. Parse actual error from response body instead of just statusText for better diagnostics
4. Skip temporary memories (thoughts) from embedding generation entirely
5. Log warnings when truncation occurs

RESULTS: This prevents 109 memories from silently failing to embed. Empirical data shows 96% of memories now fit within the limit after truncation.

LINKED SOLUTIONS: See decision-embedding-context-limit-solution-for-memory-refresh-embeddings and learning-retro-embedding-truncation-solved-silent-failures for implementation details.
