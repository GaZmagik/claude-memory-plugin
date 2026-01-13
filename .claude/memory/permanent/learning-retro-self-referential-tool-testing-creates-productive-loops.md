---
id: learning-retro-self-referential-tool-testing-creates-productive-loops
title: "retro: Self-referential tool testing creates productive loops"
type: learning
scope: project
created: "2026-01-13T22:26:46.163Z"
updated: "2026-01-13T22:26:46.163Z"
tags:
  - retrospective
  - process
  - tooling
  - project
---

When a tool's functionality is needed to verify findings about that tool, fixing the tool becomes the critical path. The --call claude feature was broken, preventing multi-agent verification. Fixing it (f11ff4c) then enabled verification of other findings via the same feature. Circular dependencies in tooling should be identified early.
