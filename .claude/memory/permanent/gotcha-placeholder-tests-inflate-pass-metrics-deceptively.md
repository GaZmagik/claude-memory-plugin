---
id: gotcha-placeholder-tests-inflate-pass-metrics-deceptively
title: Placeholder tests inflate pass metrics deceptively
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-26T21:59:13.835Z"
updated: "2026-02-26T21:59:31.139Z"
tags:
  - testing
  - test-quality
  - metrics
  - code-review
  - project
---

Placeholder tests using expect(true).toBe(true) artificially inflate pass counts and hide untested code. Converting 66 placeholder tests to it.skip reduced reported passes from 4645→4585 (60 skipped) but improved metric honesty. Audit test quality, not just counts.
