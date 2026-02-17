---
id: gotcha-incomplete-mock-types-in-tests-generate-cascading-typescript-errors
title: Incomplete mock types in tests generate cascading TypeScript errors
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-07T09:23:51.823Z"
updated: "2026-02-16T22:30:07.300Z"
tags:
  - typescript
  - testing
  - mocks
  - project
---

SearchResult and AgentSummary mocks missing required properties (type, tags, path) caused 75+ cascading TypeScript errors. Fixed by ensuring ALL mock objects match interface requirements completely - partial mocks fail with unhelpful diagnostics.
