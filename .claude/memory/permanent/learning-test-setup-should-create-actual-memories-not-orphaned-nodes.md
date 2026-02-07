---
id: learning-test-setup-should-create-actual-memories-not-orphaned-nodes
title: test-setup-should-create-actual-memories-not-orphaned-nodes
type: learning
scope: project
created: "2026-02-04T21:18:55.621Z"
updated: "2026-02-04T21:18:55.621Z"
tags:
  - testing
  - graph
  - test-design
  - agent-copy
  - project
---

When testing graph copy operations, test setup should create actual memory files matching the graph nodes, rather than creating orphaned nodes in graph.json without corresponding memories in index.json. This ensures tests reflect realistic scenarios.
