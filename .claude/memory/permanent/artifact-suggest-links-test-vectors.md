---
id: artifact-suggest-links-test-vectors
title: Suggest-links agent test vectors
type: artifact
scope: project
project: claude-memory-plugin
created: "2026-02-06T01:31:27.306Z"
updated: "2026-02-16T22:30:07.215Z"
tags:
  - project
---

Test suite for suggest-links agent with agent-scoped flag support. Tests verify that cmdSuggestLinks correctly respects the --agent flag and reads from the correct path when provided. Currently in TDD red phase - tests fail as expected because implementation does not support the flag yet.
