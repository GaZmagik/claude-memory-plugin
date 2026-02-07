---
id: gotcha-readme-injection-config-requires-nested-yaml-structure
title: README injection config requires nested YAML structure
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-25T20:51:34.102Z"
updated: "2026-02-01T22:38:06.499Z"
tags:
  - documentation
  - yaml
  - injection
  - config
  - v1.1.0
  - project
---

The memory injection configuration in README.md must use nested YAML structure with provider keys containing type arrays, not flat keys. Incorrect: inject_hints, inject_learnings. Correct: claude: { hints: true, learnings: true }. This was identified as a critical documentation bug during pre-shipping review.
