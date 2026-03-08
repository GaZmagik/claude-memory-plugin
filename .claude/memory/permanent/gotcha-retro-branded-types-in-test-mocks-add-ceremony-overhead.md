---
id: gotcha-retro-branded-types-in-test-mocks-add-ceremony-overhead
title: Retro - Branded types in test mocks add ceremony overhead
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-03-08T00:34:58.035Z"
updated: "2026-03-08T00:35:38.124Z"
tags:
  - retrospective
  - process
  - testing
  - branded-types
  - project
severity: medium
---

When using branded types (e.g. MemoryId), test fixtures require wrapping every mock ID with unsafeAsMemoryId() constructor. For complex test suites with many mocks, this becomes brittle and eventually necessitates 'as any' casts. Consider: simpler type design for test ergonomics, or test helpers that auto-cast.
