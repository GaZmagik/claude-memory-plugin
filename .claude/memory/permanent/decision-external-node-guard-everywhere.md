---
id: decision-external-node-guard-everywhere
title: Guard all write/delete operations against external nodes
type: decision
scope: project
created: "2026-02-22T10:22:44.156Z"
updated: "2026-02-22T10:22:44.156Z"
tags:
  - feature-005
  - guards
  - external-nodes
  - architecture
  - project
---

Guard all write/delete operations against external nodes (type Rule or Reminder) by checking graph.nodes before any mutation. Quality functions (assess, audit) auto-skip external nodes without assessment. This pattern ensures external nodes are read-only and immutable across all commands.
