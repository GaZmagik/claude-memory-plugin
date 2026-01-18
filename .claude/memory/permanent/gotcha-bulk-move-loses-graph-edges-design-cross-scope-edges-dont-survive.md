---
id: gotcha-bulk-move-loses-graph-edges-design-cross-scope-edges-dont-survive
title: Bulk Move Loses Graph Edges (Design - Cross-Scope Edges Don't Survive)
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-12T23:38:34.450Z"
updated: "2026-01-13T19:02:56.185Z"
tags:
  - gotcha
  - bulk-operations
  - graph-design
  - scope-isolation
  - project
severity: medium
links:
  - learning-immutable-graph-operations-pattern
  - learning-scope-isolation-architecture-design
  - artifact-gotcha-prevention-checklist
---

# Gotcha: Bulk Move Loses Graph Relationships

## The Issue

When moving memories between scopes (e.g., project → local), the graph edges are removed from the source scope but NOT migrated to the target scope:

```typescript
// move.ts:165-173
sourceGraph = removeNode(sourceGraph, id);  // Removes node AND edges
await saveGraph(sourceBasePath, sourceGraph);

// move.ts:175-189
targetGraph = addNode(targetGraph, { id, type: ... });  // Adds node only - NO edges
await saveGraph(targetBasePath, targetGraph);
```

## Why This Happens

Graphs are scope-local. Each scope has its own `graph.json`. If `decision-A` (project scope) links to `learning-B` (also project scope), that edge lives in the project graph.

When `decision-A` moves to local scope, it becomes:
- Removed from project `graph.json` (correct)
- Added to local `graph.json` as orphan node (node exists but no edges)

A cross-scope edge (`local → project`) doesn't exist in either graph, so it's lost.

## Implication

**After bulk-move**: Moved memories are orphaned (0% connectivity) until:
1. Run `sync` on target scope (validates but doesn't rebuild)
2. Manually recreate links via `link` command
3. Run `suggest-links` with embeddings (uses AI to guess relationships)
4. Add `links:` field to frontmatter if relationships are documented there

The 43 memories moved to local scope have no edges in local `graph.json`.

## Resolution

This is intentional design, not a bug. Document it in help text and recovery procedures. Consider:
- Adding `--rebuild-edges` flag to bulk-move (requires source/target graphs to copy matching edge targets)
- Prompting user to run `suggest-links` after bulk-move
- Storing relationship intent in frontmatter `links:` field for cross-scope survival

## Tags
- gotcha
- bulk-operations
- graph-design
- scope-isolation
