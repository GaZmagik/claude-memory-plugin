---
id: decision-embedding-generation-should-be-default
title: Decouple embedding generation from auto-link flag
type: decision
scope: project
created: "2026-02-01T15:13:50.868Z"
updated: "2026-02-01T15:13:50.868Z"
tags:
  - embeddings
  - memory-plugin
  - architecture
  - ollama
  - project
---

Embedding generation should be decoupled from the --auto-link flag and made the default behaviour for all write operations, with graceful fallback when Ollama is unavailable (2-second timeout, non-blocking). This requires separating the embedding provider creation from auto-linking logic.
