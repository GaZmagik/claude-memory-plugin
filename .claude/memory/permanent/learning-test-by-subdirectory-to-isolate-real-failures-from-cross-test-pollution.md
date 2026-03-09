---
id: learning-test-by-subdirectory-to-isolate-real-failures-from-cross-test-pollution
title: Test by subdirectory to isolate real failures from cross-test pollution
type: learning
scope: project
project: claude-memory-plugin
created: "2026-03-07T18:30:31.540Z"
updated: "2026-03-07T18:30:52.331Z"
tags:
  - testing
  - debugging
  - bun
  - troubleshooting
  - project
---

When investigating large test failure counts, run tests by subdirectory (e.g., `bun test skills/memory/src/`). If failures disappear, pollution is the culprit not code bugs. Applied here: all 5,097 tests pass individually; 328 failures only appear in full suite run due to Bun's module registry leaks.
