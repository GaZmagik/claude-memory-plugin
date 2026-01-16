---
id: gotcha-retro-refresh-embeddings-flag-incomplete-needs-debugging
title: Retro - Refresh --embeddings flag incomplete, needs debugging
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-16T14:41:56.058Z"
updated: "2026-01-16T18:04:44.594Z"
tags:
  - retrospective
  - process
  - incomplete-feature
  - memory-system
  - project
  - gotcha
severity: medium
---

The `memory refresh project --embeddings` command exists but fails with 'Ollama API error: Internal Server Error'. Direct testing shows embedding API works fine, individual batch calls work fine, but something in the full refresh flow breaks. Investigation was abandoned mid-way. Future work needed: either fix the embeddings feature properly or remove the incomplete flag to avoid confusion.
