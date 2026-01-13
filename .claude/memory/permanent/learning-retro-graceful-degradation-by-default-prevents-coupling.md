---
id: learning-retro-graceful-degradation-by-default-prevents-coupling
title: "retro: Graceful Degradation by Default Prevents Coupling"
type: decision
scope: project
project: claude-memory-plugin
created: "2026-01-13T00:22:26.518Z"
updated: "2026-01-13T19:02:56.174Z"
tags:
  - retrospective
  - process
  - project
links:
  - learning-memory-context-hook-graceful-search-degradation
  - learning-scope-isolation-architecture-design
---

The auto-link implementation passes Ollama provider optionally - if unavailable, memory writes succeed without embedding. No new hard dependency. Better than assuming Ollama always available or failing fast.
