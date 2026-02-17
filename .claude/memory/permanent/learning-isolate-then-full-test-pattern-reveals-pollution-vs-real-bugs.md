---
id: learning-isolate-then-full-test-pattern-reveals-pollution-vs-real-bugs
title: Isolate then full test pattern reveals pollution vs real bugs
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-04T22:43:52.472Z"
updated: "2026-02-16T22:30:07.141Z"
tags:
  - testing
  - debugging
  - test-pollution
  - methodology
  - project
---

Running single test files reveals genuine bugs; running full suite shows cross-file pollution. Pattern: (1) Run test file in isolation to identify real bugs, (2) Fix them, (3) Run full suite to identify pollution sources. This separates signal (real bugs) from noise (test state leakage). Applied successfully to rename/copy/import tests - fixed 3 genuine bugs (import graph relationships, YAML format, missing frontmatter), then identified remaining 19 failures as pollution.
