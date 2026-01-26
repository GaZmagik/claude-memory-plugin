---
id: decision-v110-auto-uses-configured-model
title: Auto-selection uses configured chat model from memory.local.md
type: decision
scope: project
created: "2026-01-24T22:32:01.930Z"
updated: "2026-01-24T22:32:01.930Z"
tags:
  - v1.1.0
  - ollama
  - "--auto"
  - configuration
  - project
---

The --auto flag uses the chat model configured in memory.local.md rather than a hardcoded model. This allows users with fast GPUs to use 4b+ models for higher quality, while slower hardware can use 1b for speed. Quality vs speed trade-off is user-configurable.
