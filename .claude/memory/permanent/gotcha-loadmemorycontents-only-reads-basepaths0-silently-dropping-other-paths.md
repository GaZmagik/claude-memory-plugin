---
id: gotcha-loadmemorycontents-only-reads-basepaths0-silently-dropping-other-paths
title: loadMemoryContents only reads basePaths[0], silently dropping other paths
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-03-08T04:32:51.555Z"
updated: "2026-03-08T04:33:24.287Z"
tags:
  - bug
  - basepaths
  - content-loading
  - memory-summarize
  - project
---

The feature-006-memory-summarize implementation had a critical bug where loadMemoryContents only read from basePaths[0], causing --include-shared and --all-agents flags to silently drop memories from other basePath entries. Discovered during comprehensive code review (CR-1 in speckit:review output).
