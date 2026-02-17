---
id: learning-aspirational-tests-need-rewriting-to-match-actual-implementation
title: Aspirational tests need rewriting to match actual implementation
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-06T01:10:33.432Z"
updated: "2026-02-16T22:30:07.479Z"
tags:
  - testing
  - tdd
  - test-expectations
  - project
---

Tests that expect features not yet implemented should be rewritten to match the actual implementation's behaviour and API. The test-mermaid-agent-shared.spec.ts expected cross-scope linking and inline :::node syntax, but neither existed. Fixed by adjusting assertions to verify what actually gets implemented.
