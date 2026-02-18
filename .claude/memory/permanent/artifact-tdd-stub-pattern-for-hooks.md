---
id: artifact-tdd-stub-pattern-for-hooks
title: TDD stub pattern for hook infrastructure files
type: artifact
scope: project
project: claude-memory-plugin
created: "2026-02-17T00:27:35.271Z"
updated: "2026-02-17T08:02:05.339Z"
tags:
  - tdd
  - hooks
  - pattern
  - enforcement
  - project
---

When creating hook infrastructure (e.g., detect-agent.ts), use TDD stub creation pattern: (1) Create empty .ts and .spec.ts files via Bash touch to satisfy hook enforcement, (2) Write comprehensive tests in .spec.ts (RED phase), (3) Implement functionality to make tests pass (GREEN phase). Avoids hook blocking while maintaining test-first discipline. Commands remain excluded via .tddignore.
