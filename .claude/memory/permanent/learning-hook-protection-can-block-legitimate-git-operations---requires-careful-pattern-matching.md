---
id: learning-hook-protection-can-block-legitimate-git-operations---requires-careful-pattern-matching
title: Hook protection can block legitimate git operations - requires careful pattern matching
type: learning
scope: local
project: claude-memory-plugin
created: "2026-01-10T06:08:44Z"
updated: "2026-01-13T18:49:49.826Z"
tags:
  - learning
  - gotcha
  - medium
  - process
  - hooks
  - protection-patterns
links:
  - learning-gitignore-comment-formatting-two-phase-fix
  - artifact-hook-system-patterns-catalogue
---

# Hook protection can block legitimate git operations - requires careful pattern matching

**Category:** gotcha
**Severity:** medium
**Date:** 2026-01-10

## Context

Protecting .specify symlink with PreToolUse hook that blocks rm commands

## Problem

Hook blocked git rm --cached (safe operation that only affects git index). Initially couldn't untrack .specify from version control. Blocked user's legitimate workflow.

## Solution

Add exception for safe git operations. Pattern: /\bgit\s+rm\s+--cached\b/ allows git index operations while still protecting filesystem. Test hook logic with legitimate use cases.

## Example

```
protect-specify-symlinks.ts initially blocked all rm commands touching .specify. Updated to allow git rm --cached only (doesn't touch filesystem). Now safe to remove tracked symlinks.
```

## Prevention

When writing protective hooks, whitelist safe operations explicitly. Test both block and allow cases. Document what operations are intentionally allowed.
