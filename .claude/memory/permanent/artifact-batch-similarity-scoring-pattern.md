---
id: artifact-batch-similarity-scoring-pattern
title: "Batch similarity scoring pattern: embeddings → cosine → optional LLM verify"
type: artifact
scope: project
project: claude-memory-plugin
created: "2026-02-23T21:46:01.997Z"
updated: "2026-02-23T21:46:06.934Z"
tags:
  - batch operations
  - similarity
  - graph operations
  - pattern
  - testable-design
  - project
---

Reusable pattern for batch graph operations: (1) load embedding cache, (2) enumerate edges, (3) look up embeddings for source/target pairs, (4) compute cosine similarity, (5) optional LLM verification of relation labels, (6) batch-write all updates once.

Key dependency reuse: cosineSimilarity(search/similarity.ts), loadEmbeddingCache(search/embedding.ts), getEdges/updateEdge(graph/edges.ts), loadGraph/saveGraph(graph/structure.ts), Ollama.generate(services/ollama.ts), VALID_LABEL_RE(suggest-links.ts).

Test pattern: use temp dir fixtures, spy Ollama methods, verify counts. See lines 132-152 in .claude/plans/magical-hugging-boole.md
