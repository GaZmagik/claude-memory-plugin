---
id: learning-retro-vitest-workers-forbid-processchdir-use-basepath-instead
title: Retro - Vitest workers forbid process.chdir, use basePath instead
type: learning
scope: project
created: "2026-02-06T08:18:29.627Z"
updated: "2026-02-06T08:18:29.627Z"
tags:
  - retrospective
  - vitest
  - testing
  - process
  - project
severity: medium
---

When running tests in vitest workers, process.chdir() raises ERR_WORKER_UNSUPPORTED_OPERATION. Solution: pass basePath explicitly to API calls instead of relying on process.cwd(). This is actually cleaner — explicit over implicit — and results in more testable code.
