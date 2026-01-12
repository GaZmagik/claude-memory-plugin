---
type: learning
title: Two-Hook Enforcement Pattern for Memory Operations
created: "2026-01-12T20:40:21.402Z"
updated: "2026-01-12T20:40:21.402Z"
tags:
  - hooks
  - architecture
  - enforcement
  - memory-plugin
  - project
scope: project
---

Split memory protection into two separate hooks: protect-memory-directory.ts blocks Write/Edit/MultiEdit tools from modifying .claude/memory/ files, while enforce-memory-cli.ts blocks bash operations (rm, mv, cp, redirects) with whitelists for memory CLI and read-only operations. Each hook has focused responsibility.
