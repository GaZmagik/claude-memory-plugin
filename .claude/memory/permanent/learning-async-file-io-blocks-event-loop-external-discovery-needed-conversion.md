---
id: learning-async-file-io-blocks-event-loop-external-discovery-needed-conversion
title: Async file I/O blocks event loop - external discovery needed conversion
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-21T08:57:34.625Z"
updated: "2026-02-21T08:58:05.127Z"
tags:
  - async
  - file-io
  - performance
  - external-files
  - project
---

Converting external-file-discovery.ts from 9 synchronous file operations (statSync, readFileSync, readdirSync, realpathSync) to async counterparts eliminated event-loop blocking. Critical for performance with large file sets.
