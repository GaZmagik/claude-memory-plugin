---
id: gotcha-cross-scope-auto-linking-not-implemented-in-suggest-links
title: Cross-scope auto-linking not implemented in suggest-links
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-16T23:27:39.684Z"
updated: "2026-02-17T08:02:05.383Z"
tags:
  - memory-plugin
  - suggest-links
  - cross-scope-linking
  - feature-gap
  - project
---

suggest-links can discover cross-scope relationships when using --include-shared flag, but --auto-link only creates links within the primary scope. Cross-scope suggestions are shown but not automatically persisted. Workaround: manually create links with memory link --target-scope.
