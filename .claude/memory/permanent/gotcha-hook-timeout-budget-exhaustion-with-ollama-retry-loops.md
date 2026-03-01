---
id: gotcha-hook-timeout-budget-exhaustion-with-ollama-retry-loops
title: Hook timeout budget exhaustion with Ollama retry loops
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-28T03:22:23.326Z"
updated: "2026-02-28T09:20:43.052Z"
tags:
  - hooks
  - ollama
  - timeout
  - external-services
  - project
---

memory-context hook was timing out (25s max) because generate() calls with timeout:10000 and default maxRetries:2 = 3 attempts × 10s = 30s total, exceeding budget. Hooks cannot afford retry loops when calling slow external services. Fix: Set maxRetries:0 in hook's generate() calls and increase test spawn timeouts to 15s to account for bun startup overhead.
