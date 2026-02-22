---
id: gotcha-retro-skipped-pre-work-memory-check-violated-protocol
title: Retro - Skipped pre-work memory check violated protocol
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-20T17:45:40.598Z"
updated: "2026-02-20T17:46:02.584Z"
tags:
  - retrospective
  - process
  - memory-hygiene
  - protocol
  - project
severity: high
---

The comprehensive multi-agent review was launched without first running /memory:check-gotchas to surface relevant prior learnings. This violated the established protocol from CLAUDE.md. Prevention: Make memory check the FIRST task in every phase TODO list, before tool execution. Even when reviews seem straightforward, existing gotchas may provide crucial context.
