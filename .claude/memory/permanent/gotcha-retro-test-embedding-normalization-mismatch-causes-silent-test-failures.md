---
id: gotcha-retro-test-embedding-normalization-mismatch-causes-silent-test-failures
title: Retro - Test embedding normalization mismatch causes silent test failures
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-19T17:13:13.552Z"
updated: "2026-02-19T18:01:27.640Z"
tags:
  - retrospective
  - testing
  - embeddings
  - project
severity: medium
---

When testing embedding-based functionality, embeddings created via indexExternalFiles() go through normalise() but mock embeddings in test setup often don't. This causes findSimilarMemories() to silently return zero matches. Solution: Always normalise all test embeddings consistently, or pre-normalise mock vectors before cache setup. Affects any test combining mock embeddings with actual similarity functions.
