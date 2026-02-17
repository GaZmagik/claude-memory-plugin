---
id: gotcha-flag-creation-code-persisted-in-multiple-hooks-despite-removal-comments
title: Flag creation code persisted in multiple hooks despite 'removal' comments
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-09T14:12:25.881Z"
updated: "2026-02-16T22:30:07.301Z"
tags:
  - flags
  - hooks
  - code-review
  - documentation-mismatch
  - project
---

Global pre-compact hook claimed 'Flag creation removed - blocking hooks no longer in use' but flag creation was still active in plugin hooks (memory-capture.ts, memory-cleanup.ts) and flag-checking code spanned 5+ global hooks. Comments claiming removal are unreliable; must verify actual code exists and be removed explicitly.
