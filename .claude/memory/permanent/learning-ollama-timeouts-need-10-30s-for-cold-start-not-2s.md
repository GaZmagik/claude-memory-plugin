---
id: learning-ollama-timeouts-need-10-30s-for-cold-start-not-2s
title: Ollama timeouts need 10-30s for cold-start, not 2s
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-28T01:18:31.123Z"
updated: "2026-02-01T22:38:06.963Z"
tags:
  - ollama
  - timeouts
  - performance
  - hook-configuration
  - project
---

Ollama model cold-start (first load) requires 10-30s depending on model size. Initial timeout of 2s breaks for users with slower systems. Increased to 30s in v1.1.1 and v1.1.2 for robustness.
