---
id: gotcha-retro-hook-timeouts-were-too-aggressive-2s-broke-ollama-for-users
title: Retro - Hook timeouts were too aggressive (2s), broke Ollama for users
type: gotcha
scope: project
created: "2026-01-26T22:33:27.355Z"
updated: "2026-01-26T22:33:27.355Z"
tags:
  - retrospective
  - hooks
  - v1.1.1
  - project
severity: high
---

UserPromptSubmit and PostToolUse hooks had 2s Ollama timeout which was far too short. Ollama needs 10-30s depending on model loading state. Users saw no output because hooks silently timed out. Fixed in PRs #28-29 to 10s (UserPromptSubmit) and increased hook timeout to 30s (PostToolUse).
