---
id: learning-cosine-similarity-requires-normalized-embedding-vectors
title: Cosine similarity requires normalized embedding vectors
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-19T17:59:21.271Z"
updated: "2026-02-19T18:01:26.371Z"
tags:
  - testing
  - embeddings
  - mathematics
  - project
---

When testing semantic similarity across embeddings, vectors must be normalized to magnitude 1. Test failures with 'analysed: 0' (no pairs found) often indicate non-normalized embeddings rather than logic errors. Normalizing to unit vectors ensures consistent cosine similarity calculations.
