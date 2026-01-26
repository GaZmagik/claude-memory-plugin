---
id: gotcha-think-frontmatter-fields-require-full-serialisation-stack-tracing
title: Think frontmatter fields require full serialisation stack tracing
type: gotcha
scope: project
created: "2026-01-25T12:38:07.185Z"
updated: "2026-01-25T12:38:07.185Z"
tags:
  - think-frontmatter
  - serialisation
  - t019
  - t020
  - project
---

When working with think.ts frontmatter fields for hint visibility (T019-T020), fields must trace through entire serialisation stack from frontmatter parsing through CLI output. Failure to trace full stack causes field mismatches between stored data and displayed hints. Critical for integration work.
