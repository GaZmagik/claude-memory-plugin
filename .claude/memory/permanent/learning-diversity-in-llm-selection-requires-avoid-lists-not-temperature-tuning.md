---
id: learning-diversity-in-llm-selection-requires-avoid-lists-not-temperature-tuning
title: Diversity in LLM selection requires avoid lists, not temperature tuning
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-24T22:31:43.896Z"
updated: "2026-02-01T22:38:06.740Z"
tags:
  - v1.1.0
  - ollama
  - diversity
  - prompt-engineering
  - project
---

Tested temperature variations (0.7-1.2) with identical prompts - gemma3:1b returned 'Pragmatist' all 5 times. Forced diversity requires passing 'Avoid: X, Y (already used)' in prompt to get next-best-appropriate selection. Temperature has no effect on diversity.
