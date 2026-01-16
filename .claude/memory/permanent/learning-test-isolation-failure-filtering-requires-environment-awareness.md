---
id: learning-test-isolation-failure-filtering-requires-environment-awareness
title: Test isolation failures can mask real issues - use environment-aware discovery
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-16T08:14:31.988Z"
updated: "2026-01-16T13:44:26.653Z"
tags:
  - retrospective
  - process
  - testing
  - discovery
  - project
---

This session: 364 test failures in 'bun test' vs 7 in 'bun run test' (proper isolation). Root cause: discovery.ts used process.cwd() to detect plugin agents/styles, which changed when tests ran in different isolation contexts. Solution: Make discovery paths configurable and add 'disablePluginScope' flag for testing. Pattern: When test counts vary dramatically by runner, suspect environment-dependent code (process.cwd, __dirname, environment variables) rather than logic bugs.
