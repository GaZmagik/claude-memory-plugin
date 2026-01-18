---
id: gotcha-retro-dead-code-detection-phantom-tests-mock-impossible-scenarios
title: "Retro - Dead code detection: phantom tests mock impossible scenarios"
type: gotcha
scope: project
created: "2026-01-17T23:59:53.738Z"
updated: "2026-01-18T00:07:31.181Z"
tags:
  - retrospective
  - testing
  - dead-code
  - project
severity: high
---

Session found 5 phantom tests mocking parseMemoryFile to return null frontmatter - a scenario impossible in reality since parseMemoryFile throws on invalid input. These tests were load-bearing for 10 dead null checks across 8 source files. Pattern: if mocks are testing a path that the source code checks for but the implementation forbids, that's dead code. Tests can hide dead code by mocking impossible scenarios.
