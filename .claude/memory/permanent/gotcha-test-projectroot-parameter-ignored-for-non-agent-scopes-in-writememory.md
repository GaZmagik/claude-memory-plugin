---
id: gotcha-test-projectroot-parameter-ignored-for-non-agent-scopes-in-writememory
title: Test projectRoot parameter ignored for non-agent scopes in writeMemory
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-06T00:28:55.664Z"
updated: "2026-02-16T22:30:07.254Z"
tags:
  - test-setup
  - mermaid
  - phase-e
  - memory-api
  - project
---

writeMemory ignores projectRoot for non-agent scopes, using process.cwd() instead. Tests must use basePath parameter to write to correct graph location. This caused mermaid tests to write project memories to cwd but resolver expected them at cwd/.claude/memory.
