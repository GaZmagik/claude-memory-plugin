---
id: learning-retro-pure-function-mock-removal-pattern-is-highly-effective
title: Retro - Pure function mock removal pattern is highly effective
type: learning
scope: project
created: "2026-01-18T02:32:19.292Z"
updated: "2026-01-18T02:32:19.292Z"
tags:
  - retrospective
  - testing
  - mock-reduction
  - process
  - project
severity: high
---

Session removed 45 mocks across read/tag/write spec files by identifying pure functions (parseMemoryFile, serialiseMemoryFile, updateFrontmatter) that don't need mocking. Pattern: 1) Identify functions with no I/O, 2) Replace with valid test data, 3) Remove mocks, 4) Update assertions to use flexible matchers where needed. Tests immediately pass with clearer intent. Maintenance spec files (move, promote) already follow this pattern with real filesystem integration.
