---
id: gotcha-marketplace-plugin-missing-bun-dependencies
title: Marketplace plugin missing bun dependencies
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-26T22:33:43.401Z"
updated: "2026-02-01T22:38:06.596Z"
tags:
  - hooks
  - marketplace
  - v1.1.2
  - dependencies
  - project
---

PostToolUse hooks fail silently because marketplace plugin lacks node_modules. SessionStart hook should run 'bun install' to auto-repair. Affects all memory injection features (gotchas, learnings, decisions).
