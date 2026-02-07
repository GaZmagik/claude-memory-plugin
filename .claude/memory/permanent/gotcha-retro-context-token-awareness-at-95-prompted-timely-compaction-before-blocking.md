---
id: gotcha-retro-context-token-awareness-at-95-prompted-timely-compaction-before-blocking
title: Retro - Context token awareness at 95% prompted timely compaction before blocking
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-01T23:02:00.510Z"
updated: "2026-02-01T23:03:09.144Z"
tags:
  - retrospective
  - process
  - context-management
  - project
severity: low
---

Session reached ~95% context budget before compacting. While compaction succeeded cleanly, earlier awareness would have provided buffer for unexpected work. Lesson: Monitor context closely during long speckit workflows (spec → plan → tasks → analysis → fixes → commit). These sequential phases accumulate context. Pattern: At 85% during spec-intensive work, consider wrapping up current phase or deferring to fresh session.
