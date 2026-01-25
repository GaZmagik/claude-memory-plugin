---
id: gotcha-event-listener-cleanup-requires-specificity-to-avoid-breaking-async-operations
title: Gotcha - Event listener cleanup requires specificity to avoid breaking async operations
type: gotcha
scope: project
created: "2026-01-25T21:18:46.346Z"
updated: "2026-01-25T21:18:46.346Z"
tags:
  - retrospective
  - gotcha
  - async
  - events
  - nodejs
  - project
severity: high
---

When fixing stream/event race conditions in async code, calling removeAllListeners() without specifying the event type can inadvertently remove critical event handlers (like 'close' events on processes). Always target specific events: removeAllListeners('data') instead of removeAllListeners(). First iteration failed tests for 30s timeout because 'close' event listener was affected. Second iteration using event-specific removal fixed the issue immediately.
