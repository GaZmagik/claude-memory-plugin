---
id: learning-retro-async-conversion-file-by-file-with-test-validation-catches-integration-issues-early
title: Retro - Async conversion file-by-file with test validation catches integration issues early
type: learning
scope: project
created: "2026-01-17T21:30:48.439Z"
updated: "2026-01-17T21:30:48.439Z"
tags:
  - retrospective
  - process
  - async-conversion
  - testing
  - project
severity: medium
---

Converting sync file I/O to async is most effective when done file-by-file with immediate test validation after each conversion. Running tests after each file ensures type errors and integration issues are caught immediately, preventing cascading problems across dependent files. This sequential validation approach is more efficient than converting all files then testing.
