---
id: learning-api-validation-must-occur-before-sanitisation-for-security
title: API validation must occur before sanitisation for security
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-02T22:46:16.240Z"
updated: "2026-02-16T22:30:07.255Z"
tags:
  - validation
  - architecture
  - design
  - phase-a
  - project
---

In resolver.ts resolveAgentScope(), validate the raw agent name BEFORE sanitisation. This ensures API layer enforces strict rules, while CLI layer can be user-friendly. Sanitisation only happens at CLI boundary.
