---
id: learning-base-path-validation-rejects-fictional-test-paths
title: Base path validation rejects fictional test paths
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-23T17:28:54.200Z"
updated: "2026-02-23T17:29:22.684Z"
tags:
  - suggest-links
  - security
  - testing
  - validation
  - project
---

M2 security validator correctly rejects all test paths like /test/project, /agent/path that don't match real memory hierarchy. Tests must use TEST_BASE constants or real paths (e.g., $HOME/.claude/memory) to pass basePath validation checks.
