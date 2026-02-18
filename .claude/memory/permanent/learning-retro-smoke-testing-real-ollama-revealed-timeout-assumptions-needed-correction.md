---
id: learning-retro-smoke-testing-real-ollama-revealed-timeout-assumptions-needed-correction
title: Retro - Smoke testing real Ollama revealed timeout assumptions needed correction
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-18T18:10:46.295Z"
updated: "2026-02-18T18:11:45.584Z"
tags:
  - retrospective
  - process
  - integration-testing
  - ollama
  - phase-e
  - project
severity: medium
---

Phase D implementation assumed 15s timeout was sufficient for Ollama operations. Only when running actual suggest-links --llm-type with 707 cached memories did we discover cold-start gemma3:4b required 300s timeout, and --verify needed 60s. This revealed a gap: service-layer timeouts should be validated against real operational profiles before declaring phases complete. The fix was clean (configurable timeoutMs parameter), but the discovery should have happened earlier via integration testing rather than final smoke test.
