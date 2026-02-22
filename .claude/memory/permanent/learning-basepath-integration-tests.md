---
id: learning-basepath-integration-tests
title: Integration tests revealed critical basePath setup pattern
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-22T10:22:55.503Z"
updated: "2026-02-22T10:26:21.070Z"
tags:
  - feature-005
  - testing
  - integration
  - basePath
  - test-pattern
  - project
---

Integration tests initially failed because they used memoryDir instead of tempDir as basePath. Memory functions expect the project root (tempDir) and append .claude/memory internally. Following existing test patterns (external-file-integration.spec.ts) was critical for success.
