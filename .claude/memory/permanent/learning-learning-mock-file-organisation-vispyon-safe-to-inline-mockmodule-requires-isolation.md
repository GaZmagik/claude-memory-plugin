---
id: learning-learning-mock-file-organisation-vispyon-safe-to-inline-mockmodule-requires-isolation
title: "Learning - Mock file organisation: vi.spyOn() safe to inline, mock.module() requires isolation"
type: learning
scope: project
created: "2026-01-17T01:07:49.230Z"
updated: "2026-01-17T01:07:49.230Z"
tags:
  - retrospective
  - process
  - testing
  - mocking
  - project
severity: medium
---

When refactoring test files, distinguish between mock patterns: vi.spyOn() mocks are safe to inline into parent test files (no global state pollution), but mock.module() mocks require separate files for process isolation. The 9 inlined mock files used spyOn() pattern; thoughts-ai.spec.ts uses mock.module() and stays separate. This pattern clarification should guide future test organisation decisions.
