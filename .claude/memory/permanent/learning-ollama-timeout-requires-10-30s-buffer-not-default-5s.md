---
id: learning-ollama-timeout-requires-10-30s-buffer-not-default-5s
title: Ollama timeout requires 10-30s buffer, not default 5s
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-18T17:11:17.939Z"
updated: "2026-02-18T17:12:05.820Z"
tags:
  - ollama
  - timeout
  - services
  - phase-d
  - project
---

Ollama service timeouts must be at least 10-30s for reliable cold model startup. Default 5s causes consistent failures. Phase D plan's 15s timeout is safe middle ground.
