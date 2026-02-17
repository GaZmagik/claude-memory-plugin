---
id: decision-disable-clear-restoring-flag-hooks
title: Disabled clear/restoring flag hooks and approval key system
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-06T11:40:49.072Z"
updated: "2026-02-16T22:30:07.470Z"
tags:
  - hooks
  - session-restore
  - flags
  - simplification
  - project
severity: high
---

Removed 9 user-level hooks from settings.json that enforced the clear/restoring flag workflow. Updated session-restore.md (v1.7.0) and session-continue.md (v1.2.0) to remove flag-related steps. Hook source files NOT deleted, only removed from settings.json wiring. Rationale: Memory system works well enough without mandatory flag-gated restore.
