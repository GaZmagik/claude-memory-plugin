---
id: learning-scope-reduction-for-system-hooks-through-expert-consultation-prevents-coupling
title: Scope reduction for system hooks through expert consultation prevents coupling
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-15T23:03:58.115Z"
updated: "2026-01-16T13:44:26.589Z"
tags:
  - retrospective
  - process
  - architecture
  - plugin
  - project
---

Initial plan for memory hook enhancements started with 4 new hook files + modifications. Expert consultation (Haiku + Sonnet perspectives) revealed: suggest-links adds latency (bad for UX), config flags create maintenance burden, separate health-check creates God files. Refined plan reduced scope by 60% while improving quality. Key: system hooks (especially in pre-compact/session-start) have high coupling risk—multiple perspectives catch this early.
