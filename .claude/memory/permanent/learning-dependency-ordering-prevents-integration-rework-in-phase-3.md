---
id: learning-dependency-ordering-prevents-integration-rework-in-phase-3
title: Learning - Dependency ordering prevents integration rework in Phase 3
type: learning
scope: project
created: "2026-01-25T14:56:32.318Z"
updated: "2026-01-25T14:56:32.318Z"
tags:
  - retrospective
  - process
  - architecture
  - project
severity: medium
---

Implemented core modules first (heuristics, sanitisation, circuit breaker, validate-selection, ollama-selector) before higher-level AutoSelector. This allowed testing each component in isolation and validating type signatures early. AutoSelector integration required only fixing one test bug. Future phases: identify deepest dependencies and implement bottom-up.
