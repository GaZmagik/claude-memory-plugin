---
id: learning-n1-file-reads-in-search-without-early-exit-validation
title: N+1 file reads in search without early exit validation
type: learning
scope: project
created: "2026-02-06T23:49:57.576Z"
updated: "2026-02-06T23:49:57.576Z"
tags:
  - performance
  - search
  - database-patterns
  - optimization
  - project
---

Search logic read every memory file even when title/tags didn't match. 1000 memories = 2000 filesystem calls. Early exit before I/O on non-matching metadata prevents this. Performance agent caught this—validation must precede I/O.
