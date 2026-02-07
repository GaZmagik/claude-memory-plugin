---
id: artifact-phase3-avoid-list-extraction-pattern
title: "Phase 3: Avoid-list extraction for agent diversity"
type: artifact
scope: project
project: claude-memory-plugin
created: "2026-01-25T14:56:46.354Z"
updated: "2026-02-01T22:38:06.518Z"
tags:
  - phase3
  - auto-selection
  - pattern
  - diversity
  - project
---

Pattern for extracting previously-used agents/styles from session memories to prevent repetition. Ollama prompt excludes these via avoid list, ensuring fresh selections on each invocation. Implements diversity constraint without explicit user configuration.
