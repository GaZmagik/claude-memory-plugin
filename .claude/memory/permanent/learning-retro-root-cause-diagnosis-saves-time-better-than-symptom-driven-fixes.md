---
id: learning-retro-root-cause-diagnosis-saves-time-better-than-symptom-driven-fixes
title: Retro - Root cause diagnosis saves time better than symptom-driven fixes
type: learning
scope: project
created: "2026-02-28T03:26:24.758Z"
updated: "2026-02-28T03:26:24.758Z"
tags:
  - retrospective
  - process
  - debugging
  - project
severity: medium
---

When hook integration tests timed out at 25s, session diagnosed root cause (Ollama generate() calls taking 12s × 3 retries = 36s) rather than just increasing timeouts. This revealed that maxRetries: 2 + timeout: 10s = unrealistic constraints for integration tests. Fixed by setting maxRetries: 0 in hook generate() calls, reducing actual timeout from 25s to 10s. Pattern: trace the chain (hook timeout → spawn timeout → generate timeout → Ollama latency) before adjusting numbers.
