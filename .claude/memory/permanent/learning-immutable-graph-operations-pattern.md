---
id: learning-immutable-graph-operations-pattern
title: immutable-graph-operations-pattern
type: permanent
scope: local
project: claude-memory-plugin
created: 2026-01-10T19:58:41Z
updated: 2026-01-10T19:58:45Z
tags: ["learning","tip","medium","graph-operations","immutability","typescript-patterns","design-pattern"]
embedding: "ac7a908b716028f1f12d6ee42b131af8"
links: []
---

# immutable-graph-operations-pattern

**Category:** tip
**Severity:** medium
**Date:** 2026-01-10

## Context

Implemented graph operations (structure.ts, edges.ts, traversal.ts) for memory linking

## Problem

Graph mutations can corrupt graph.json if not careful about state consistency

## Solution

All graph operations return NEW graph objects (immutable pattern). Functions like addNode(), addEdge(), removeEdge() all return {...graph, nodes: [...graph.nodes, newNode]} to ensure original is never mutated.

## Example

```
addEdge(graph, 'a', 'b') returns new object; original graph unchanged until explicitly saved
```

## Prevention

For any shared data structures, use immutable patterns. TypeScript compiler catches accidental mutations with const.
