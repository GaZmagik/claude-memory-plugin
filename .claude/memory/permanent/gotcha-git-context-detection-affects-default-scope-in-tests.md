---
id: gotcha-git-context-detection-affects-default-scope-in-tests
title: Git context detection affects default scope in tests
type: gotcha
scope: project
created: "2026-02-04T08:37:03.597Z"
updated: "2026-02-04T08:37:03.597Z"
tags:
  - testing
  - git-context
  - scope-resolution
  - mocking
  - project
---

When testing resolveSharedScopePaths(), discovered that getDefaultScope() checks if cwd is in a git repository. Tests must mock git detection or use paths outside home directory to avoid unexpected scope resolution. This caused test failures when default scope resolved to agent-global instead of agent-project.
