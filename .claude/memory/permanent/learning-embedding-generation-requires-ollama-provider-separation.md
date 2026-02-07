---
id: learning-embedding-generation-requires-ollama-provider-separation
title: Embedding generation requires Ollama provider separation
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-01T15:13:57.111Z"
updated: "2026-02-01T22:38:06.706Z"
tags:
  - embeddings
  - ollama
  - memory-plugin
  - architecture
  - error-handling
  - project
---

To make embedding generation default behaviour, the Ollama provider must be created independently of auto-linking logic. Error handling should use a 2-second timeout with graceful fallback rather than blocking writes. The existing architecture supports this well—embeddings just need to be decoupled from the --auto-link flag.
