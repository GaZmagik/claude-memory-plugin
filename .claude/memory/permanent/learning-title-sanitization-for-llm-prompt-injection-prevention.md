---
id: learning-title-sanitization-for-llm-prompt-injection-prevention
title: Title sanitization for LLM prompt injection prevention
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-23T17:29:19.654Z"
updated: "2026-02-23T17:29:22.684Z"
tags:
  - suggest-links
  - security
  - llm
  - prompt-injection
  - project
---

M1 fix: Strip quotes (including backticks) from titles before embedding in LLM prompts. Use structural delimiters like [title] to create hard boundaries. sanitiseTitleForPrompt() implements this pattern—match before building prompts.
