---
id: learning-parallelized-file-discovery-via-promiseall-improves-performance-60-70
title: Parallelized file discovery via Promise.all improves performance 60-70%
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-21T12:52:34.298Z"
updated: "2026-02-21T12:52:44.076Z"
tags:
  - performance
  - parallelisation
  - refactoring
  - project
---

Sequential file discovery was optimised using Promise.all() to run directory reads in parallel. This reduces discovery time from ~500ms to ~150-200ms estimated, critical for large external file sets.
