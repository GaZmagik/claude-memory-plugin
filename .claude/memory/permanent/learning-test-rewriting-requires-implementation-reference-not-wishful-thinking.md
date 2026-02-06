---
id: learning-test-rewriting-requires-implementation-reference-not-wishful-thinking
title: Test rewriting requires implementation reference, not wishful thinking
type: learning
scope: project
created: "2026-02-06T01:21:13.515Z"
updated: "2026-02-06T01:21:13.515Z"
tags:
  - TDD
  - testing
  - integration-tests
  - project
---

Aspirational tests (test-suggest-links-agent.spec.ts) were completely disconnected from actual API shape. Must read implementation first: suggestLinks returns { status, suggestions: SuggestedLink[], created, skipped, analysed } with SuggestedLink having source, target, similarity, sourceTitle, targetTitle, reason. Avoid method names that don't exist (tags, bidirectional, group-by-type, apply).
