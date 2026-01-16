---
id: retro-batch-operations-pattern
title: Batch Operations Pattern for Performance
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-12T16:00:00Z"
updated: "2026-01-16T23:10:44.270Z"
tags:
  - retrospective
  - process
  - architecture
  - performance
  - phase-4
severity: medium
---

# Batch Operations Pattern

## Pattern

Replace sequential N×(load-modify-save) cycles with single load-apply-all-save cycle.

```typescript
// Bad: O(n) saves
for (const id of ids) {
  const index = await loadIndex();  // n times
  index.memories = index.memories.filter(e => e.id !== id);
  await saveIndex(index);  // n times
}

// Good: O(1) saves
const index = await loadIndex();  // once
const idsSet = new Set(ids);
index.memories = index.memories.filter(e => !idsSet.has(e.id));
await saveIndex(index);  // once
```

## Applied to

- Bulk delete (batch index removal)
- Bulk link (batch graph edge additions)
- Import (batch memory writes + graph updates)

## Benefits

1. **Performance**: 50-100× faster for 100+ items
2. **Error handling**: Atomic all-or-nothing at end, not per-item
3. **Simplicity**: Single error path, no partial-success merging
4. **Resource safety**: Fewer I/O operations = lower failure surface

## Key Implementation Details

- Load structure once
- Accumulate all changes in memory (arrays, mutations)
- Validate all items before final save
- Save once at end
- Fail-fast: catch errors during processing, report batch result
