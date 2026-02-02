---
id: learning-gemini-model-extraction-requires-user-agent-fallback
title: Gemini model extraction requires User-Agent fallback
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-26T16:24:28.031Z"
updated: "2026-02-01T22:38:06.399Z"
tags:
  - gemini
  - parser
  - model-extraction
  - project
---

Gemini model info comes from MCP stderr but JSON error responses also contain model field. Use User-Agent pattern as fallback when JSON parsing fails.
