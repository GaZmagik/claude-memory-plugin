---
id: retro-type-consistency-required-triple-sync
type: learning
title: "Type consistency requires triple sync: frontmatter, index, graph"
tags: [retrospective, process, memory-system, architecture]
created: 2026-01-13T19:10:00.000Z
updated: 2026-01-13T19:10:00.000Z
scope: project
---

## Insight

During promote/demote operations, type changes were made to only 1-2 of the three sources of truth (frontmatter, index.json, graph.json). This cascaded inconsistency through subsequent operations.

## The Issue

The `promote` command updated frontmatter + graph + index, but index rebuild would re-derive type from ID prefix, overwriting promotions. The graph.json held "correct" type but index.json would be wrong after rebuild.

## The Fix

1. **Index rebuild** - Changed to prefer `frontmatter.type` over parsed ID type
2. **Promote command** - Added auto-rename when type prefix doesn't match target type  
3. **Refresh command** - Added graph type sync from frontmatter after processing

## Lesson

Multiple serialized representations need a single authoritative source with consistency enforced at all write points, not just read time.
