---
id: artifact-infrastructure-removal-pattern
title: Systematic Infrastructure Removal Pattern
type: artifact
scope: project
project: claude-memory-plugin
created: "2026-02-09T14:12:34.986Z"
updated: "2026-02-16T22:30:07.223Z"
tags:
  - infrastructure
  - cleanup
  - deprecation
  - patterns
  - hooks
  - project
---

When removing deprecated infrastructure (like flag-based blocking): (1) Identify all creation points (plugin hooks + global hooks), (2) Disable creation in plugins first, (3) Remove flag-checking logic in dependent hooks, (4) Update related test files, (5) Purge all disk artifacts, (6) Verify no orphaned references remain via grep. Apply coordinated edits across all layers simultaneously to prevent partial cleanup.
