---
id: learning-retro-isolate-then-full-test-pattern-reveals-pollution-vs-real-bugs
title: Retro - Isolate-then-full test pattern reveals pollution vs real bugs
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-04T22:43:12.343Z"
updated: "2026-02-16T22:30:07.217Z"
tags:
  - retrospective
  - process
  - testing
  - debugging
  - project
severity: medium
---

When test failures appear, run the test in isolation first. If it passes alone but fails in full suite, you have test pollution (early test's mocks not cleaned up). If it fails in isolation, it's a real bug. This pattern saved significant debugging time—copy tests all passed isolated (real bugs fixed) but failed in full suite (pollution), while rename tests failed isolated (fixable bugs). Use this as first triage step for test failures.
