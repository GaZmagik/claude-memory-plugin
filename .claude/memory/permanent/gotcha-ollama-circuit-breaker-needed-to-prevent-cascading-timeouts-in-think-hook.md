---
id: gotcha-ollama-circuit-breaker-needed-to-prevent-cascading-timeouts-in-think-hook
title: Ollama circuit breaker needed to prevent cascading timeouts in think hook
type: gotcha
scope: project
created: "2026-01-25T14:56:41.217Z"
updated: "2026-01-25T14:56:41.217Z"
tags:
  - phase3
  - ollama
  - performance
  - reliability
  - project
---

Without circuit breaker, a single slow Ollama invocation hangs the entire agent. Circuit breaker opens after 3 failures and uses heuristics fallback, preventing 10+ second delays that block user interaction.
