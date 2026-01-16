---
id: learning-two-hook-enforcement-pattern-for-memory-operations
title: Two-Hook Enforcement Pattern for Memory Operations
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-12T20:40:21.402Z"
updated: "2026-01-16T23:10:42.895Z"
tags:
  - hooks
  - architecture
  - enforcement
  - memory-plugin
  - project
---

Split memory protection into two separate hooks: protect-memory-directory.ts blocks Write/Edit/MultiEdit tools from modifying .claude/memory/ files, while enforce-memory-cli.ts blocks bash operations (rm, mv, cp, redirects) with whitelists for memory CLI and read-only operations. Each hook has focused responsibility.
