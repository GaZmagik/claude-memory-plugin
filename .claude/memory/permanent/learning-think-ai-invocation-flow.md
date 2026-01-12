---
type: learning
title: Think AI invocation - context passing pattern
topic: AI-assisted thinking document implementation
created: 2026-01-12T10:45:00.000Z
updated: 2026-01-12T10:45:00.000Z
tags: [think, ai-invocation, claude-cli, feature-001, typescript]
severity: high
---

Critical pattern for `--call claude` in think feature:

1. **Existing thoughts passed in user prompt** (not system prompt) - provides context for AI to respond appropriately
2. **Style via `--system-prompt`** - replaces default system prompt entirely
3. **Agent via `--append-system-prompt`** - adds domain expertise AFTER style (stacked, not replaced)
4. **Session ID capture** - new sessions get `--session-id <uuid>`, resuming uses `--resume <id>`
5. **Author attribution** - format as `"Claude [session-id]"` for future `--resume` support

Diverges from naive approach of passing everything as user prompt. Stratified use of system vs user prompts enables proper context hierarchy.
