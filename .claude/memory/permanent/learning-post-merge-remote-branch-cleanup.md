---
id: learning-post-merge-remote-branch-cleanup
title: Post-merge remote branch cleanup with git prune
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-22T17:31:32.858Z"
updated: "2026-02-22T17:31:42.905Z"
tags:
  - git
  - workflow
  - maintenance
  - project
---

After gh pr merge --merge, use git remote prune origin to clean stale tracking refs. Feature 005 had 6 old branches pruned; ensures main branch stays clean and uncluttered.
