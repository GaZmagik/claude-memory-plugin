---
id: learning-retro-parse-runtime-output-instead-of-guessing-provider-defaults
title: Retro - Parse runtime output instead of guessing provider defaults
type: learning
scope: project
created: "2026-01-26T14:25:17.012Z"
updated: "2026-01-26T14:25:17.012Z"
tags:
  - retrospective
  - process
  - provider-routing
  - architecture
  - project
severity: medium
---

Provider model defaults in config files become stale (e.g., gemini-2.5-pro is not the actual default). Solution: extract model from CLI output at runtime. Use --debug flags and parse stderr/stdout for model name. This is more reliable than config-based defaults and catches fallback scenarios (when CLI uses different model than requested). Added extractCodexModel() and extractGeminiModel() functions for this. Incomplete for gemini (model not in captured output in non-TTY contexts) but pattern is sound.
