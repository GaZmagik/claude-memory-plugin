---
id: gotcha-hook-tests-that-dont-import-actual-hook-code-give-false-confidence
title: Hook tests that don't import actual hook code give false confidence
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-27T17:16:19.004Z"
updated: "2026-02-27T17:16:35.845Z"
tags:
  - hooks
  - testing
  - test-quality
  - project
---

Hook test files like ollama-prewarm.spec.ts can test mock behaviour without importing the actual hook module. This creates passing tests that don't validate production code. Solution: Convert to it.skip with descriptions of what should actually be tested. Prevents false negatives from misleading green tests.
