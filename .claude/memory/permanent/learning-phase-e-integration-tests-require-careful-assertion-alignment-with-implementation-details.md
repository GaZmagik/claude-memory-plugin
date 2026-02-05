---
id: learning-phase-e-integration-tests-require-careful-assertion-alignment-with-implementation-details
title: Phase E integration tests require careful assertion alignment with implementation details
type: learning
scope: project
created: "2026-02-05T16:54:45.410Z"
updated: "2026-02-05T16:54:45.410Z"
tags:
  - phase-e
  - testing
  - integration-tests
  - mermaid-styling
  - project
---

Mermaid agent styling uses class-based statements (class ... agentNode) rather than inline styling (:::agentNode). Tests must check for actual implementation syntax, not aspirational syntax. Memory graph needs nodes with agent/scope/title fields populated for filtering to work correctly.
