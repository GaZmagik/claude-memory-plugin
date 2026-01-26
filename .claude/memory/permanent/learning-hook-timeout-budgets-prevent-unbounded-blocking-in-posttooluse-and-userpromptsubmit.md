---
id: learning-hook-timeout-budgets-prevent-unbounded-blocking-in-posttooluse-and-userpromptsubmit
title: Hook timeout budgets prevent unbounded blocking in PostToolUse and UserPromptSubmit
type: learning
scope: project
created: "2026-01-25T21:18:48.522Z"
updated: "2026-01-25T21:18:48.522Z"
tags:
  - performance
  - hooks
  - timeouts
  - budgeting
  - project
---

Ollama generate() calls in hooks default to 30 seconds, but hooks should timeout much earlier (2-5s per call). PostToolUse and UserPromptSubmit hooks need per-call timeout budgets to prevent blocking Claude's main interaction loop for 60-90 seconds in worst case.
