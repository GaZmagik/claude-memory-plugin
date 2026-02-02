---
id: learning-provider-modules-pattern-commands-parsers-detection-in-separate-files
title: "Provider modules pattern: commands, parsers, detection in separate files"
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-25T16:27:00.242Z"
updated: "2026-02-01T22:38:06.183Z"
tags:
  - architecture
  - providers
  - modularity
  - phase-4
  - project
---

Phase 4 cross-provider architecture: separate modules for (1) building CLI commands, (2) parsing provider-specific output, (3) detecting CLI availability. Keeps logic modular and testable for Codex, Gemini, and Claude variants.
