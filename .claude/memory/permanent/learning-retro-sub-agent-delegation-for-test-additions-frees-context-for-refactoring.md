---
id: learning-retro-sub-agent-delegation-for-test-additions-frees-context-for-refactoring
title: Retro - Sub-agent delegation for test additions frees context for refactoring
type: learning
scope: project
created: "2026-03-08T21:21:50.456Z"
updated: "2026-03-08T21:21:50.456Z"
tags:
  - retrospective
  - testing
  - delegation
  - project
severity: medium
---

When working on complex refactoring (e.g., discriminated union types, Promise.all parallelisation), delegating test case additions to JavaScript/TypeScript sub-agents preserves main session context for source logic. Capture agent IDs for follow-up. Verify tests pass after delegation, but do not block on agent completion message—this pattern allows async progress in parallel tracks.
