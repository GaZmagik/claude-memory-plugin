---
id: gotcha-restoring-flag-remains-active-across-restoration-cycles
title: Restoring flag remains active across restoration cycles
type: gotcha
scope: project
created: "2026-02-06T08:51:55.044Z"
updated: "2026-02-06T08:51:55.044Z"
tags:
  - restoration
  - flags
  - gotcha
  - project
---

When a session exits mid-restoration, the restoring flag persists. Subsequent session-restore invocations do not clear the old flag before relaunching agents, causing repetitive re-entry into the restoration ceremony. The flag should be cleared at the start of /session-restore or via PostToolUse hook after /session-continue completes.
