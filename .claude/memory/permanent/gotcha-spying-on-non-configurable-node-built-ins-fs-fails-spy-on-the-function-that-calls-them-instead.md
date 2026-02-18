---
id: gotcha-spying-on-non-configurable-node-built-ins-fs-fails-spy-on-the-function-that-calls-them-instead
title: Gotcha - Spying on non-configurable Node built-ins (fs) fails; spy on the function that calls them instead
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-18T17:10:52.943Z"
updated: "2026-02-18T17:12:06.027Z"
tags:
  - retrospective
  - process
  - testing
  - node
  - phase-c
  - project
severity: medium
---

Phase C check-relevance tests (T041, T043) initially failed trying to spy on non-configurable fs properties. Error: 'Cannot redefine property: stat'. Solution: Don't spy on Node built-ins directly. Instead: (1) For functions that write files, spy on the actual exported function being called (e.g., moveMemory). (2) For pure functions, skip fs spy entirely—correctness is proved by return values, not side effects. This prevents trying to reconfigure read-only properties. Pattern: spy on your own code, not the platform.
