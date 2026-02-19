---
id: learning-retro-scope-determination-requires-priority-ordering-gitroot-projectroot-homedir
title: "Retro - Scope determination requires priority ordering: gitRoot > projectRoot > homeDir"
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-19T09:50:46.851Z"
updated: "2026-02-19T11:03:33.289Z"
tags:
  - retrospective
  - process
  - file-discovery
  - scope-logic
  - project
severity: medium
---

During external file discovery implementation (T064-T073), scope determination logic required careful priority ordering. Rule files should check gitRoot first, then projectRoot, then homeDir. Similarly, reminder scope should prefer projectRoot over homeDir when both exist. Edge case: when projectRoot === homeDir, the logic must still correctly identify scope (using startsWith checks on absolutePath). Pattern: Always check more-specific scopes first, fallback to broader scopes. This prevents incorrectly categorizing files as global when they're actually project-scoped.
