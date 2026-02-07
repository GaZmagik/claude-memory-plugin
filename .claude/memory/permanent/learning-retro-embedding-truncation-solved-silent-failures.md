---
id: learning-retro-embedding-truncation-solved-silent-failures
title: Retro - Embedding truncation solved silent failures
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-16T16:38:03.288Z"
updated: "2026-02-01T22:38:06.202Z"
tags:
  - retrospective
  - embedding
  - debugging
  - fix
  - project
severity: high
---

When Ollama embedding API fails with 'Internal Server Error', the actual cause is often content exceeding model context length (6000 char limit for embeddinggemma). Solution: (1) truncate at word boundaries before sending, (2) parse actual error from response body instead of just statusText. This prevents 109 memories silently failing to embed.
