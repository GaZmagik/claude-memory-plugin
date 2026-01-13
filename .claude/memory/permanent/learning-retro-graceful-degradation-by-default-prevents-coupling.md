---
id: learning-retro-graceful-degradation-by-default-prevents-coupling
title: "retro: Graceful Degradation by Default Prevents Coupling"
type: learning
scope: project
created: "2026-01-13T00:22:26.518Z"
updated: "2026-01-13T00:22:26.518Z"
tags:
  - retrospective
  - process
  - project
---

The auto-link implementation passes Ollama provider optionally - if unavailable, memory writes succeed without embedding. No new hard dependency. Better than assuming Ollama always available or failing fast.
