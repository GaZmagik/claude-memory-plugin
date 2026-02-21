---
id: gotcha-feature-005-synchronous-file-io-blocks-event-loop-in-external-discovery
title: "Feature 005: Synchronous file I/O blocks event loop in external discovery"
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-21T07:48:50.375Z"
updated: "2026-02-21T08:58:05.202Z"
tags:
  - feature-005
  - event-loop
  - performance
  - regression
  - blocking-io
  - project
---

External file discovery module uses fs.statSync, fs.readFileSync, fs.readdirSync which block event loop for 10-100ms per operation. With 100+ files this exceeds 50ms budget. Regression from prior async refactoring work. Affects external-file-discovery.ts and embedding.ts.
