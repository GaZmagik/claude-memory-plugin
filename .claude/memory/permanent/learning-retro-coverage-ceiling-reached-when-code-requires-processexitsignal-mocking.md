---
id: learning-retro-coverage-ceiling-reached-when-code-requires-processexitsignal-mocking
title: Retro - Coverage ceiling reached when code requires process.exit/signal mocking
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-16T19:01:46.765Z"
updated: "2026-02-01T22:38:06.601Z"
tags:
  - retrospective
  - process
  - testing
  - coverage
  - project
severity: medium
---

When improving test coverage, hard-to-test code paths (process.exit, SIGTERM handlers, process.argv) create a coverage plateau. error-handler.ts plateaued at 38.6% despite adding tests for registry functions. Recognize these boundaries early and focus coverage effort on achievable targets (refresh-frontmatter.ts went 43%→81.85%) rather than pushing past hard technical limits.
