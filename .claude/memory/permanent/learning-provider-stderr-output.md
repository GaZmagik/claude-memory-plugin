---
id: learning-provider-stderr-output
title: Provider CLI output goes to stderr, not stdout
type: learning
scope: project
created: "2026-01-26T14:25:27.698Z"
updated: "2026-01-26T14:25:27.698Z"
tags:
  - provider-integration
  - cli-parsing
  - stderr
  - v1.1.1
  - project
---

When invoking codex/gemini CLIs programmatically via spawnSync, debug output and model info appear in stderr, not stdout. Must capture both streams for reliable model extraction. Codex outputs banner with model to stderr; gemini debug info includes model references but not always in captured output.
