---
id: learning-hook-ollama-timeout-insufficient
title: Hook Ollama timeout too short (2s) - needs 10-30s
type: learning
scope: project
created: "2026-01-26T22:33:49.208Z"
updated: "2026-01-26T22:33:49.208Z"
tags:
  - hooks
  - ollama
  - timing
  - v1.1.2
  - project
---

Both PostToolUse and UserPromptSubmit hooks had 2s Ollama timeouts which caused timeouts before topic extraction completed. Increased to 10s for extraction, 30s for full injection. Ollama model loading and inference require >2s.
