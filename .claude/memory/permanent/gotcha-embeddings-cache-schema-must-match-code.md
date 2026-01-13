---
id: gotcha-embeddings-cache-schema-must-match-code
title: Embeddings Cache Schema Must Match Code
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-13T19:30:39.922Z"
updated: "2026-01-13T19:45:06.427Z"
tags:
  - embedding
  - cache
  - gotcha
  - project
severity: medium
---

The embeddings.json cache uses 'memories' key, not 'entries'. Empty embedding vectors ([]) cause 'Vectors cannot be empty' errors in similarity calculations. When migrating or fixing cache, ensure schema matches EmbeddingCache interface and remove empty vectors.
