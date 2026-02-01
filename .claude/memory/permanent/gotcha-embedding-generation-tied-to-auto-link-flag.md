---
id: gotcha-embedding-generation-tied-to-auto-link-flag
title: embedding-generation-tied-to-auto-link-flag
type: gotcha
scope: project
created: "2026-02-01T15:13:29.375Z"
updated: "2026-02-01T15:13:29.375Z"
tags:
  - embeddings
  - memory-plugin
  - search
  - architecture
  - project
---

Embeddings are only generated when using the --auto-link flag, creating a two-tier memory system where 119 out of 135 memories lack embeddings. This architectural coupling is unnecessary and prevents search functionality for non-auto-linked memories.
