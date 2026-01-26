---
id: artifact-v110-ollama-selection-prompt
title: Ollama style/agent/model selection prompt template
type: artifact
scope: project
created: "2026-01-24T22:32:03.881Z"
updated: "2026-01-24T22:32:03.881Z"
tags:
  - v1.1.0
  - ollama
  - prompt-template
  - reusable
  - project
---

Reliable prompt structure: 'Pick ONE style and ONE model. Styles: [list]. Models: [list]. Thought: [thought]. Respond ONLY with valid JSON.' Include 'Avoid: X, Y (already used)' to force diversity. Produces reliable JSON in <1s with gemma3:1b.
