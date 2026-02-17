---
id: decision-prioritise-fixing-genuine-bugs-over-investigating-cross-file-test-pollution
title: Prioritise fixing genuine bugs over investigating cross-file test pollution
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-04T22:44:22.449Z"
updated: "2026-02-16T22:30:07.270Z"
tags:
  - testing
  - test-pollution
  - prioritisation
  - methodology
  - project
---

When encountering test failures that pass in isolation but fail in full suite, prioritise fixing the genuine bugs (signal) over tracking down pollution sources (noise). Applied in session: fixed 3 genuine bugs (import graph relationships, YAML format, missing frontmatter), then identified remaining 19 failures as pollution. Decision: Continue with implementation (Tasks F014-F020) and address pollution later if test suite becomes blocker. This maximises forward progress on feature.
