---
id: learning-retro-tdd-with-distributed-tests-requires-explicit-tddignore-documentation
title: Retro - TDD with distributed tests requires explicit .tddignore documentation
type: learning
scope: project
created: "2026-01-25T12:22:32.411Z"
updated: "2026-01-25T12:22:32.411Z"
tags:
  - retrospective
  - process
  - tdd
  - testing
  - project
severity: medium
---

Project uses tests/unit/cli/test-*.spec.ts naming but TDD hook expects co-located module.spec.ts. Solution: document non-standard pattern in .tddignore with comments explaining why (e.g., 'Tests exist in tests/unit/cli/ with test-*.spec.ts naming'). This unblocks implementation without fighting the hook.
