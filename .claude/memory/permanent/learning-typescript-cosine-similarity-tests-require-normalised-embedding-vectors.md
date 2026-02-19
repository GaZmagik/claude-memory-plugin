---
id: learning-typescript-cosine-similarity-tests-require-normalised-embedding-vectors
title: TypeScript cosine similarity tests require normalised embedding vectors
type: learning
scope: project
created: "2026-02-19T17:13:38.751Z"
updated: "2026-02-19T17:13:38.751Z"
tags:
  - testing
  - embeddings
  - cosine-similarity
  - mocking
  - project
---

When testing embedding-based similarity search in TypeScript, mock embeddings must be pre-normalised before cosine similarity calculation. Non-normalised vectors can have zero dot products, causing tests to fail silently. Use vector normalisation (divide by magnitude) or ensure consistent vector preparation across test setup and production code.
