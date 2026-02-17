---
id: gotcha-retro-hook-logs-failing-silently-makes-retrospective-debugging-difficult
title: Retro - Hook logs failing silently makes retrospective debugging difficult
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-06T01:29:40.981Z"
updated: "2026-02-16T22:30:06.914Z"
tags:
  - retrospective
  - process
  - hooks
  - memory-system
  - project
severity: high
---

Both memory-capture and retrospective hooks logged 'success' but the capture log didn't contain the expected 'status:success' JSON field. This silent failure prevented verification that memories were actually created. When hook logs lack complete status information, retrospective agents can't diagnose whether preservation actually happened. Mitigation: Hook logs should always include explicit completion status (JSON status field) and specific error details if failures occur.
