---
id: learning-retro-edge-case-tests-should-document-parser-limitations-rather-than-over-engineer
title: Retro - Edge case tests should document parser limitations rather than over-engineer
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-26T16:42:02.882Z"
updated: "2026-02-01T22:38:05.988Z"
tags:
  - retrospective
  - process
  - testing
  - test-design
  - project
severity: low
---

When writing edge case tests (e.g., model extraction from different formats), resist over-engineering the implementation. Instead, document actual parser behaviour including known limitations. Example: codex model extraction's regex consumes newlines greedily - document this in tests rather than add complex fallback logic. Tests become specification of actual behaviour, not aspirational behaviour.
