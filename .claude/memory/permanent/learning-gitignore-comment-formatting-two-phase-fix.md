---
id: learning-gitignore-comment-formatting-two-phase-fix
title: gitignore-comment-formatting-two-phase-fix
type: permanent
scope: local
project: claude-memory-plugin
created: "2026-01-10T18:12:23Z"
updated: "2026-01-12T22:02:47.198Z"
tags:
  - learning
  - gotcha
  - low
  - phase-2
  - gitignore
  - formatting
---

# gitignore-comment-formatting-two-phase-fix

**Category:** gotcha
**Severity:** low
**Date:** 2026-01-10

## Context

Phase 2 gitignore automation for local scope privacy - implementing addToGitignore() function

## Problem

Comments weren't being added with `#` prefix. First fix added comment.startsWith('#') check but didn't solve newline spacing issue. Pattern appeared on same line as comment instead of next line. Required two separate fixes: (1) comment prefix handling, (2) newline logic for blank line before comment.

## Solution

Always add `#` prefix check when handling comments. Separate newline logic: ensure trailing newline on existing content, add blank line ONLY if comment present and content exists, THEN add comment, THEN add pattern.

## Example

```
BEFORE: content += comment + '\n'; + pattern // comment and pattern on adjacent lines
```

## Prevention

Test gitignore formatting with multiple scenarios: empty file, existing content, with/without comments, Windows line endings.
