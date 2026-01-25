---
id: decision-phase3-tiered-selection-strategy
title: "Phase 3: Tiered auto-selection strategy (Ollama → Heuristics → Default)"
type: decision
scope: project
created: "2026-01-25T14:56:35.258Z"
updated: "2026-01-25T14:56:35.258Z"
tags:
  - phase3
  - auto-selection
  - ollama
  - fallback
  - resilience
  - project
---

Three-tier fallback prevents hard failures: Ollama selects based on thought content, heuristics match keywords when Ollama unavailable (timeout/error), default picks first agent if heuristics fail. Circuit breaker tracks failures and avoids cascading timeouts.
