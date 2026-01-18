---
id: gotcha-retro-mock-return-type-mismatches-missed-in-first-pass
title: Retro - Mock return type mismatches missed in first pass
type: gotcha
scope: project
created: "2026-01-18T05:09:32.148Z"
updated: "2026-01-18T05:09:32.148Z"
tags:
  - retrospective
  - process
  - testing
  - mocking
  - project
severity: medium
---

After replacing test ID literals with branded type helpers, a second pass was needed to fix mock return values (e.g., generateUniqueId mock returns). Root cause: Different error pattern (function argument mismatch vs assignment). Solution: When updating types that affect return values, include a dedicated pass for mock stubs/returns alongside the data structure changes.
