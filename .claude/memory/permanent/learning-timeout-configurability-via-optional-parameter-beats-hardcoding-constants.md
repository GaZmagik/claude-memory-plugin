---
id: learning-timeout-configurability-via-optional-parameter-beats-hardcoding-constants
title: Timeout configurability via optional parameter beats hardcoding constants
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-18T18:10:58.831Z"
updated: "2026-02-18T18:11:45.629Z"
tags:
  - ollama
  - service-design
  - timeout
  - tdd
  - project
---

Pass optional timeoutMs to shared services (e.g. generate()) rather than hardcoding. Allows callers to set context-specific values: suggest-links uses 300s (LLM verification), update-edge uses 60s (quick check). TDD first: write assertions on toHaveBeenCalledWith before wiring.
