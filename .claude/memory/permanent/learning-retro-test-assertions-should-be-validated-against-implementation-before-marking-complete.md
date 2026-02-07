---
id: learning-retro-test-assertions-should-be-validated-against-implementation-before-marking-complete
title: Retro - Test assertions should be validated against implementation before marking complete
type: learning
scope: project
created: "2026-02-05T16:54:08.643Z"
updated: "2026-02-05T16:54:08.643Z"
tags:
  - retrospective
  - process
  - tdd
  - testing
  - project
severity: medium
---

When running Phase E integration tests, discovered multiple test assertions didn't match actual implementation: (1) Inline Mermaid styling (:::) vs class-based styling (class ...), (2) Abbreviation length thresholds (500 vs 562 chars), (3) Agent name format (full vs abbreviated). Pattern: Tests were written in Red phase but assertions were idealized rather than implementation-aware. Improvement: After initial implementation fix, validate test assertions match actual output format. This caught issues faster and prevented multiple test-fix cycles.
