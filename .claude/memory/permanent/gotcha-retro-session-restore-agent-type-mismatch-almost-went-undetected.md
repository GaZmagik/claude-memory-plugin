---
id: gotcha-retro-session-restore-agent-type-mismatch-almost-went-undetected
title: Retro - Session-restore agent type mismatch almost went undetected
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-16T23:12:18.818Z"
updated: "2026-02-01T22:38:06.852Z"
tags:
  - retrospective
  - process
  - agent-routing
  - project
severity: high
---

Initial error: used memory:recall for check-gotchas task instead of general-purpose. The approval key system created duplicate 'restore-memory-recall-*' keys instead of 'restore-check-gotchas-*', which would have broken session-continue. Prevention: Documentation update with explicit warning table + inline "MUST use" notices. Root cause: Didn't read full instructions carefully enough before launching agents. Lesson: Approval key system works, but detection requires post-launch verification or clearer upfront enforcement.
