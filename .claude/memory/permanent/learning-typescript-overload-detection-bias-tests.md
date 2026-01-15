---
id: learning-typescript-overload-detection-bias-tests
title: TypeScript overload detection bias tests
type: learning
scope: project
created: "2026-01-15T08:03:34.531Z"
updated: "2026-01-15T08:03:34.531Z"
tags:
  - retrospective
  - process
  - testing
  - typescript
  - project
---

TDD parity counted function overload signatures as separate functions (outputHookResponse appeared 3x). Regex-based parsing catches all export statements; needs deduplication. Colocated tests masked this - full path-mapping would catch it.
