---
id: learning-retro-integration-tests-reveal-path-resolution-bugs-unit-tests-miss
title: Retro - Integration tests reveal path resolution bugs unit tests miss
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-22T22:45:17.434Z"
updated: "2026-02-23T06:32:34.940Z"
tags:
  - retrospective
  - process
  - testing
  - integration
  - project
severity: medium
---

While unit tests for suggest-links passed, integration tests in test-suggest-links-agent.spec.ts failed because allScopes was using process.cwd() instead of getScopePath(Scope.Project, ...). This meant embeddings were loaded from the wrong path. Integration-level testing with real file structure is essential for scope/path-handling code. Unit tests alone do not validate path resolution correctness.
