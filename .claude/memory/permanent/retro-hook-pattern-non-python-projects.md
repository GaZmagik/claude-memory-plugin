---
id: retro-hook-pattern-non-python-projects
title: Hook detection pattern for non-Python projects
type: permanent
scope: local
project: claude-memory-plugin
created: "2026-01-11T19:16:04Z"
updated: "2026-01-12T22:02:47.195Z"
tags:
  - retrospective
  - process
  - hooks
links:
  - learning-hook-protection-can-block-legitimate-git-operations---requires-careful-pattern-matching
---

Extending enforcement hooks to detect project types and gate features via approval system is cleaner than blocking outright. Example: Python venv detection in TypeScript projects - when detection fails, ask for approval instead of hard fail. Decouples project type detection from enforcement, makes hooks more reusable.
