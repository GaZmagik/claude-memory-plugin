---
id: learning-yaml-serialisation-produces-quoted-timestamps-and-multi-line-arrays
title: YAML serialisation produces quoted timestamps and multi-line arrays
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-04T22:44:03.936Z"
updated: "2026-02-16T22:30:07.540Z"
tags:
  - testing
  - yaml
  - frontmatter
  - serialisation
  - project
---

Tests expecting inline YAML format (timestamps: '2026-01-01T...', tags: [a, b, c]) fail because js-yaml serialises with quotes and multi-line arrays. Fix: Update test assertions to expect quoted format and array items on separate lines. Applied to rename.spec.ts - 2 tests fixed.
