---
id: learning-retro-scope-resolver-params-and-ordering-in-discovery-module
title: "Retro: Scope resolver params and ordering in discovery module"
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-19T09:53:15.559Z"
updated: "2026-02-19T11:03:33.151Z"
tags:
  - discovery
  - scope-resolution
  - file-indexing
  - testing
  - project
---

Scope determination (Project vs Global vs Agent) requires careful parameter checking order: (1) Check projectRoot first, (2) Check gitRoot, (3) Fall back to homeDir. When projectRoot === homeDir in tests, logic must use do-while loops to include cwd in ancestor walking, otherwise root directory files are skipped.
