---
id: learning-readme-injection-config-yaml-format-must-nest-under-provider-key
title: README injection config YAML format must nest under provider key
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-25T20:50:15.280Z"
updated: "2026-02-01T22:38:06.289Z"
tags:
  - documentation
  - yaml
  - configuration
  - injection
  - project
---

Critical documentation issue: injection config in README used flat YAML keys (claude, codex, gemini) at top level instead of nested under providers object. Caused config parsing failures. Fixed by restructuring to proper nested format per .local.md schema.
