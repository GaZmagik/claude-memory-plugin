---
id: gotcha-digest-mode-basepath-isolation
title: Digest Mode Multi-basePath Isolation Bug
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-03-08T19:23:12.457Z"
updated: "2026-03-08T19:23:30.015Z"
tags:
  - feature-006
  - summarize
  - basepath
  - state-management
  - project
---

Digest mode in summarize was only loading memory content from the first basePath. Fix: store MemoryLoadEntry tuples with per-entry basePaths, change loadMemoryContents signature, parallelise reads with Promise.allSettled, surface failures as hints. Critical for multi-scope correctness.
