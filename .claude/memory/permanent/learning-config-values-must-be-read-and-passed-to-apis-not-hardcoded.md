---
id: learning-config-values-must-be-read-and-passed-to-apis-not-hardcoded
title: Config values must be read and passed to APIs, not hardcoded
type: learning
scope: project
created: "2026-02-19T17:13:20.390Z"
updated: "2026-02-19T17:13:20.390Z"
tags:
  - ollama
  - configuration
  - api-integration
  - project
---

When --llm-type flag supports Ollama context_window configuration, the value must be read from frontmatter config (.claude/memory.local.md) and explicitly passed to the API (num_ctx option). Hardcoding context windows bypasses user configuration entirely.
