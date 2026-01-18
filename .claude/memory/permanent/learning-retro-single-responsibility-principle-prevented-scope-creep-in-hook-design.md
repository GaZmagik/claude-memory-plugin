---
id: learning-retro-single-responsibility-principle-prevented-scope-creep-in-hook-design
title: Retro - Single responsibility principle prevented scope creep in hook design
type: learning
scope: project
created: "2026-01-17T19:14:39.406Z"
updated: "2026-01-17T19:14:39.406Z"
tags:
  - retrospective
  - process
  - design
  - hooks
  - project
severity: medium
---

When initial attempt combined Bun check + auto-link + messaging in one hook, user feedback: create separate hooks. Result: check-bun-installed.mjs (standalone Bun verification) + start-memory-index.ts (memory setup). Cleaner separation made debugging tractable. Lesson: resist combining concerns even when they seem related.
