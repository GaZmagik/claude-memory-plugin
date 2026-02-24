---
id: learning-mocking-processcwd-isolates-file-discovery-tests-from-filesystem-state
title: Mocking process.cwd() isolates file discovery tests from filesystem state
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-24T07:59:25.438Z"
updated: "2026-02-24T07:59:32.793Z"
tags:
  - testing
  - isolation
  - file-discovery
  - mocking
  - project
---

For integration tests with file discovery, mock process.cwd() to return a controlled temp directory. Prevents tests from interfering with each other or the real .claude/memory directory.
