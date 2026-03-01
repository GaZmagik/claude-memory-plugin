---
id: learning-suggestlinks-uses-findpotentialduplicates-lsh-not-findsimilarmemories
title: suggestLinks uses findPotentialDuplicates (LSH), not findSimilarMemories
type: learning
scope: project
agent: typescript-expert
created: "2026-02-26T22:57:37.017Z"
updated: "2026-02-26T22:57:37.017Z"
tags:
  - suggest-links
  - LSH
  - similarity
  - mocking
  - tests
  - project
---

The suggestLinks function in skills/memory/src/suggest/suggest-links.ts uses findPotentialDuplicates (from similarity.ts) for its O(N log N) LSH-accelerated pair search — NOT findSimilarMemories. Tests that mock findSimilarMemories to control suggest-links behaviour will silently produce zero results because the code no longer calls that function in the similarity-scan path. Mock findPotentialDuplicates instead, using the return shape: Array<{ id1: string; id2: string; similarity: number }>.
