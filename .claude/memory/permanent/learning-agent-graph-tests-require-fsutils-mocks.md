---
id: learning-agent-graph-tests-require-fsutils-mocks
title: Agent graph tests must mock fsUtils functions, not fs module directly
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-07T15:36:40.383Z"
updated: "2026-02-16T22:30:07.304Z"
tags:
  - testing
  - mocks
  - agent-graph
  - fsUtils
  - async-io
  - project
---

Tests for agent-graph.spec.ts were mocking fs.existsSync, fs.readFileSync, fs.writeFileSync, but the implementation was converted to use async fsUtils.fileExists, fsUtils.readFile, fsUtils.writeFileAtomic. The mock targets were completely wrong. Updated tests to mock the correct async utilities.
