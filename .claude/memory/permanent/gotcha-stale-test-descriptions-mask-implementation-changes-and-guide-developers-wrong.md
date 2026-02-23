---
id: gotcha-stale-test-descriptions-mask-implementation-changes-and-guide-developers-wrong
title: Stale test descriptions mask implementation changes and guide developers wrong
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-23T11:36:05.128Z"
updated: "2026-02-23T11:36:40.839Z"
tags:
  - testing
  - documentation
  - test-maintenance
  - suggest-links
  - project
---

T063 in suggest-links.spec.ts claimed cross-scope auto-linking was not implemented, but it actually shipped in v1.4.0. The test description was outdated and misleading. Always update test descriptions when implementation changes significantly—they become documentation that shapes future work.
