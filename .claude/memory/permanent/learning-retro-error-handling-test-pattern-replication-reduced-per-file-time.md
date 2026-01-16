---
id: learning-retro-error-handling-test-pattern-replication-reduced-per-file-time
title: Retro - Error handling test pattern replication reduced per-file time
type: learning
scope: project
created: "2026-01-16T20:25:16.431Z"
updated: "2026-01-16T20:25:16.431Z"
tags:
  - retrospective
  - process
  - testing
  - pattern-replication
  - project
severity: medium
---

Pattern established early (export.ts, import.ts): mock dependency to throw/reject, verify error messages contain expected strings. Directly reused in maintenance.ts, conclude.ts with minor variations. Reduced per-file coverage improvement time from ~20min to ~10min. Pattern works for: read failures, write failures, parse failures, exception handling. Established pattern library in brain/memory should accelerate future coverage work on remaining 9 files (promote.ts, tags.ts, crud.ts, reindex.ts, rename.ts, search.ts, document.ts).
