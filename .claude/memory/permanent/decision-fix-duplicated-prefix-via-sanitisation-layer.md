---
id: decision-fix-duplicated-prefix-via-sanitisation-layer
title: Fix duplicated prefix via sanitisation layer
type: decision
scope: project
created: "2026-01-21T20:07:41.767Z"
updated: "2026-01-21T20:07:41.767Z"
tags:
  - memory-system
  - architecture
  - design-decision
  - project
---

Decided to fix duplicated type prefix bug by adding a stripTypePrefix() sanitisation function at the ID generation layer (slug.ts) rather than patching individual code paths. This is defensive and prevents duplication regardless of source, with minimal code changes (2 functions, comprehensive tests, version bump to 1.0.3).
