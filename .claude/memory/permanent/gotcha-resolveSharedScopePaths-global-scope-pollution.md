---
id: gotcha-resolveSharedScopePaths-global-scope-pollution
title: resolveSharedScopePaths global scope loads entire user memory
type: gotcha
scope: project
created: "2026-02-05T23:25:19.899Z"
updated: "2026-02-05T23:25:19.899Z"
tags:
  - phase-e
  - agent-scoping
  - scope-resolution
  - project
---

Including Global scope in resolveSharedScopePaths causes agent-scoped stats to load user's entire ~/.claude/memory (~228 nodes). Removed Global scope from shared scopes - now only includes Local and Project. Critical for test isolation and accurate agent-scoped statistics.
