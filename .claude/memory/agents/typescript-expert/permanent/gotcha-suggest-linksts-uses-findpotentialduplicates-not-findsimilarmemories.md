---
id: gotcha-suggest-linksts-uses-findpotentialduplicates-not-findsimilarmemories
title: suggest-links.ts uses findPotentialDuplicates not findSimilarMemories
type: gotcha
scope: project
agent: typescript-expert
created: "2026-03-01T15:18:17.155Z"
updated: "2026-03-01T15:18:17.155Z"
tags:
  - suggest-links
  - testing
  - similarity
  - mocking
  - project
---

The `suggestLinks` function in `src/suggest/suggest-links.ts` was refactored to use `findPotentialDuplicates` (LSH-accelerated, O(n*k)) instead of the old per-memory `findSimilarMemories` pattern.

Return shape difference:
- Old `findSimilarMemories`: `Array<{ id: string; similarity: number }>` (called per source memory)
- New `findPotentialDuplicates`: `Array<{ id1: string; id2: string; similarity: number }>` (called once for all embeddings)

Test mocks must be updated accordingly:
```ts
// Wrong (old API):
vi.spyOn(similarityModule, 'findSimilarMemories').mockReturnValue([{ id: 'mem-2', similarity: 0.95 }]);

// Correct (new API):
vi.spyOn(similarityModule, 'findPotentialDuplicates').mockReturnValue([{ id1: 'mem-1', id2: 'mem-2', similarity: 0.95 }]);
```

Also: graph nodes must be populated in the mock (`nodes: [{ id: 'mem-1' }, { id: 'mem-2' }]`) when `allScopes` is false, because the source filters pairs against `nodeIds`.
