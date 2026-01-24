---
id: learning-retro-prompt-structure-matters-more-than-model-size-for-ollama-routing
title: Retro - Prompt structure matters more than model size for Ollama routing
type: learning
scope: project
created: "2026-01-24T22:31:34.968Z"
updated: "2026-01-24T22:31:34.968Z"
tags:
  - retrospective
  - ollama
  - prompt-engineering
  - v1.1.0
  - project
severity: high
---

When using Ollama for task routing (like agent selection), gemma3:1b performs as well as 4b when given explicit constraints: pass available options as enumerated list + use "Respond ONLY with valid JSON" instruction. Smaller models can be fast (0.6s) and reliable with proper prompt engineering. Avoid vague prompts that allow hallucination.
