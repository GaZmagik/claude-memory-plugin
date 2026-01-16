---
id: gotcha-retro-gpu-vs-cpu-embedding-model-selection-matters
title: Retro - GPU vs CPU embedding model selection matters
type: gotcha
scope: project
created: "2026-01-16T16:38:19.691Z"
updated: "2026-01-16T16:38:19.691Z"
tags:
  - retrospective
  - embeddings
  - gotcha
  - project
severity: medium
---

Changed default embedding model from embeddinggemma:latest-cpu to embeddinggemma:latest to use GPU. CPU variant still exists but is slower and wastes GPU resources. Had to update three files: embedding.ts, hooks/services/ollama.ts, semantic-search.ts, and test expectations. Pattern: When switching between CPU/GPU variants, always check all uses including hook files. Used `git diff` to find all occurrences.
