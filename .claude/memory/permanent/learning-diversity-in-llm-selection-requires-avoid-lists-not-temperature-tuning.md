---
id: learning-diversity-in-llm-selection-requires-avoid-lists-not-temperature-tuning
title: Diversity in LLM selection requires avoid lists, not temperature tuning
type: learning
scope: project
created: "2026-01-24T22:31:43.896Z"
updated: "2026-01-24T22:31:43.896Z"
tags:
  - v1.1.0
  - ollama
  - diversity
  - prompt-engineering
  - project
---

Tested temperature variations (0.7-1.2) with identical prompts - gemma3:1b returned 'Pragmatist' all 5 times. Forced diversity requires passing 'Avoid: X, Y (already used)' in prompt to get next-best-appropriate selection. Temperature has no effect on diversity.
