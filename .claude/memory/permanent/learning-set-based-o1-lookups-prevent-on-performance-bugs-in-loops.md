---
id: learning-set-based-o1-lookups-prevent-on-performance-bugs-in-loops
title: Set-based O(1) lookups prevent O(n²) performance bugs in loops
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-27T17:16:27.473Z"
updated: "2026-02-27T17:16:35.870Z"
tags:
  - performance
  - algorithms
  - graphs
  - optimization
  - project
---

When performing existence checks inside loops (e.g., suggestLinks filtering candidate pairs), using array.some() creates O(n) per iteration. Using a pre-built Set with .has() reduces to O(1). This is critical for embedding/graph operations over large datasets where loop iterations can be thousands.
