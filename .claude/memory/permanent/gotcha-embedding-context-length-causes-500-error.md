---
id: gotcha-embedding-context-length-causes-500-error
title: Embedding Context Length Causes 500 Error
type: gotcha
scope: project
created: "2026-01-16T14:57:37.482Z"
updated: "2026-01-16T14:57:37.482Z"
tags:
  - embedding
  - ollama
  - debugging
  - fix
  - project
severity: medium
links:
  - gotcha-retro-refresh-embeddings-flag-incomplete-needs-debugging
---

When `memory refresh --embeddings` fails with "Ollama API error: Internal Server Error", the actual cause is likely content exceeding the embedding model context length. Ollama returns 500 with `{"error":"the input length exceeds the context length"}` in the response body, but our provider was only logging `response.statusText`. Fix: (1) Added `truncateForEmbedding()` to limit content to 6000 chars, (2) Parse actual error from Ollama response body for better diagnostics.
