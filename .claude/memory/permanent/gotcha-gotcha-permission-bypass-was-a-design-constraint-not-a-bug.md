---
id: gotcha-gotcha-permission-bypass-was-a-design-constraint-not-a-bug
title: Gotcha - Permission bypass was a design constraint, not a bug
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-17T05:32:29.319Z"
updated: "2026-02-01T22:38:06.058Z"
tags:
  - retrospective
  - process
  - requirements
  - project
severity: medium
---

Initial assessment treated `--dangerously-skip-permissions` in background session spawning as a security vulnerability to eliminate. Wrong framing. It's a design trade-off: automate memory capture vs require user approval. Should have asked earlier: 'What constraints does this solve?' Better solution: restrict tools (Read,Skill,Bash) rather than remove bypass. Lesson: Ask about constraints/requirements before proposing fixes that might break intended functionality.
