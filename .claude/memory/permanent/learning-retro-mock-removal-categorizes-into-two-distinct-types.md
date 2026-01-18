---
id: learning-retro-mock-removal-categorizes-into-two-distinct-types
title: Retro - Mock removal categorizes into two distinct types
type: learning
scope: project
created: "2026-01-17T23:59:59.567Z"
updated: "2026-01-18T00:07:48.955Z"
tags:
  - retrospective
  - testing
  - mocks
  - project
severity: medium
---

When removing mocks for pure functions (validation, frontmatter parsing), two categories emerged: (1) Redundant mocks - where real parser works fine on actual test data (readFile returns valid YAML, then parseMemoryFile is mocked redundantly). These hide dead code and should be removed. (2) Convenience mocks - that control timestamps or serialize output in specific ways (createFrontmatter + serialiseMemoryFile pairs, 34+ occurrences in write.spec.ts). These require changing assertion strategies (don't check exact serialized content, freeze time, etc). Removing convenience mocks is higher effort but cleaner - removes coupling to internal serialization format.
