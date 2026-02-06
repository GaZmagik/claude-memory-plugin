---
id: learning-agent-field-propagation-requires-tracing-through-all-architectural-layers
title: Agent field propagation requires tracing through all architectural layers
type: learning
scope: project
created: "2026-02-06T00:07:22.865Z"
updated: "2026-02-06T00:07:22.865Z"
tags:
  - architecture
  - agent-scoping
  - integration-testing
  - project
---

For T126 (suggest-links agent scope), agent field must propagate through: memory write → enrichment → filtering → query response. Requires careful assertion alignment in integration tests.
