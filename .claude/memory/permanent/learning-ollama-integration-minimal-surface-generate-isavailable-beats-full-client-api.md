---
id: learning-ollama-integration-minimal-surface-generate-isavailable-beats-full-client-api
title: "Ollama integration: minimal surface (generate + isAvailable) beats full client API"
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-18T17:11:54.461Z"
updated: "2026-02-18T17:12:06.117Z"
tags:
  - ollama
  - services
  - design-patterns
  - phase-d
  - project
---

Wrapping ollama-js with just generate() and isAvailable() methods decouples LLM verification from client implementation. Easier to swap providers later, simpler mocking in tests.
