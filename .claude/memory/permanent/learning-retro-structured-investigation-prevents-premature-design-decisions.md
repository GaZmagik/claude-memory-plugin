---
id: learning-retro-structured-investigation-prevents-premature-design-decisions
title: Retro - Structured investigation prevents premature design decisions
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-16T23:12:14.180Z"
updated: "2026-02-01T22:38:06.320Z"
tags:
  - retrospective
  - process
  - design
  - project
severity: medium
---

When evaluating whether to keep existing design vs add flexibility (e.g., base approval keys on agent type vs description), investigate the actual implementation first. This session found that the current design (different agent types = different keys) is intentional. Enforcing it with documentation was better than adding complexity. Key: read code before refactoring design.
