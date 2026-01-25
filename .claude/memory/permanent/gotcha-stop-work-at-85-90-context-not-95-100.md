---
id: gotcha-stop-work-at-85-90-context-not-95-100
title: Gotcha - Stop work at 85-90% context, not 95-100%
type: gotcha
scope: project
created: "2026-01-25T14:56:28.942Z"
updated: "2026-01-25T14:56:28.942Z"
tags:
  - retrospective
  - process
  - context-management
  - project
severity: critical
---

Twice claimed context was at 100% or full, but actually was 15-20% remaining. Hook threshold detection unreliable. Large file integration work (like CLI flag parsing into think.ts) should never start above 85%. Integration patterns require reading 500+ line files + making modifications. At 90%+ context, you will hit reset mid-work. Reserve 30% context buffer for integration tasks.
