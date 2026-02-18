---
id: learning-pre-checking-memory-gotchas-for-integration-points-prevents-reinvention-ollama-timeout-case
title: Learning - Pre-checking memory gotchas for integration points prevents reinvention (Ollama timeout case)
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-18T17:11:06.409Z"
updated: "2026-02-18T17:12:05.911Z"
tags:
  - retrospective
  - process
  - integration
  - memory-discipline
  - project
severity: high
---

Phase D (LLM Verification) integrated Ollama service. Before starting, memory had flagged: 'Ollama timeout needs 10–30s, default 15s is safe'. This warning enabled confident implementation without trial-and-error on timeout tuning. Discipline: Always search memory for relevant gotchas BEFORE starting a new phase, especially for integration work or service interactions. This prevents rediscovering known constraints and accelerates implementation. In this session, checking memory proactively meant Ollama integration was straightforward with zero timeout issues.
