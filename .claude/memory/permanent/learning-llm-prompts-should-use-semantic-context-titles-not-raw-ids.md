---
id: learning-llm-prompts-should-use-semantic-context-titles-not-raw-ids
title: LLM prompts should use semantic context (titles) not raw IDs
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-18T20:49:59.478Z"
updated: "2026-02-19T06:33:18.685Z"
tags:
  - llm-prompts
  - semantic-context
  - user-experience
  - project
---

When passing memory node references to LLM prompts (e.g., --verify for link label suggestions), resolve and use node titles instead of raw IDs. This provides semantic context that improves LLM suggestions. Fall back to raw ID if title unavailable. Applied to link-update.ts --verify path.
