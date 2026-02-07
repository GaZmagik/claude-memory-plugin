---
id: learning-test-aspirational-markers-should-be-removed
title: Aspirational it.skip and it.todo markers indicate incomplete work and should be removed
type: learning
scope: project
created: "2026-02-07T15:36:55.371Z"
updated: "2026-02-07T15:36:55.371Z"
tags:
  - testing
  - test-quality
  - code-completion
  - tdd
  - project
---

Found it.skip in think.spec.ts testing a hint API that was never implemented (hints output to stderr differently). Also found 3 it.todo placeholders in agent-search.spec.ts for semantic search features that already worked. Removed skip, implemented proper tests for todos. Complete projects have 0 skip/todo markers.
