---
id: learning-graph-modifications-not-persisted-without-explicit-save
title: Graph modifications not persisted without explicit save
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-21T03:45:09.974Z"
updated: "2026-02-21T03:45:39.180Z"
tags:
  - persistence
  - graph
  - indexing
  - project
---

indexExternalFiles modified graph/index in memory but cmdIndexContext never called saveGraph/saveIndex. Result: nodes reported as 'added' but weren't in disk files. Fixed by adding await saveGraph() and await saveIndex() after indexing.
