---
id: learning-retro-pure-function-mocks-are-redundant-and-obscure-real-behavior
title: Retro - Pure function mocks are redundant and obscure real behavior
type: learning
scope: project
created: "2026-01-18T01:29:52.292Z"
updated: "2026-01-18T01:29:52.292Z"
tags:
  - retrospective
  - testing
  - mock-reduction
  - learning
  - project
severity: medium
---

During mock reduction (Phase 1): Discovered that mocking pure functions like parseMemoryFile, updateFrontmatter, and serialiseMemoryFile is redundant. These functions have no I/O - the real implementation works fine in tests. Benefit of removing: tests become clearer (real parsing behavior visible), mocks are only used for I/O (file reads) and error-handling paths. Pattern: Keep mocks ONLY for .readFile (I/O) and parseMemoryFile.mockImplementation(() => throw) (error paths). Removed 50+ redundant mocks.
