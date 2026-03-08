---
id: decision-export-readcontextwindow-from-ollama-service
title: Export readContextWindow from ollama service
type: decision
scope: project
project: claude-memory-plugin
created: "2026-03-08T00:35:27.440Z"
updated: "2026-03-08T00:35:38.201Z"
tags:
  - architecture
  - exports
  - ollama
  - feature-006
  - project
---

Export readContextWindow() function from ollama.ts service module. This function validates context window capacity before streaming, and is required by the summarize module to ensure LLM responses fit within available context.
