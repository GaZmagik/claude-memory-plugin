---
id: learning-retro-scope-assumptions-about-feature-coverage-should-be-validated-early
title: Retro - Scope assumptions about feature coverage should be validated early
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-20T11:52:08.805Z"
updated: "2026-02-20T11:53:04.042Z"
tags:
  - retrospective
  - process
  - testing
  - scope
  - project
severity: medium
---

When designing tests for new features (like T137 semantic search), validate scope boundaries against actual implementation before writing tests. In this case, the search API doesn't support external file paths yet, so semantic search tests would fail. A quick grep of the search implementation would have clarified that scope and saved test rewriting effort. Pattern: read implementation first when scope is uncertain.
