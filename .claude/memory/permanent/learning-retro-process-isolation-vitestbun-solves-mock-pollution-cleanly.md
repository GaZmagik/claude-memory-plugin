---
id: learning-retro-process-isolation-vitestbun-solves-mock-pollution-cleanly
title: Retro - Process isolation (vitest→bun) solves mock pollution cleanly
type: learning
scope: project
created: "2026-01-16T19:01:36.516Z"
updated: "2026-01-16T19:01:36.516Z"
tags:
  - retrospective
  - process
  - testing
  - vitest
  - project
severity: medium
---

When vi.mock() causes global pollution in test suites (355 failures in coverage runs), applying process isolation (running polluting tests separately via &&) is more effective than fixing individual tests. This pattern is reusable across projects and solved the issue completely without test rewrites.
