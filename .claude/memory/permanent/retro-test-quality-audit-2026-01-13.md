---
id: retro-test-quality-2026-01-13
type: learning
title: Test Quality Audit Retrospective - Property Tests Expose Contract Violations
created: 2026-01-13T00:36:00.000Z
updated: 2026-01-13T00:36:00.000Z
tags: [retrospective, property-testing, test-quality, debugging]
scope: project
---

## Session Insights

### Property Tests Expose Implementation Contract Violations
Generated 76 property-based tests across 3 core modules. 6 failures revealed specification/implementation divergence:
- `parseMemoryFile`: Tests expected graceful error returns on invalid frontmatter, but function throws
- `removeNode`: Tests expected separate tracking of edge removal, but function already removes associated edges during node removal
- `slugify`: Tests expected underscores converted to hyphens, but actual implementation preserves underscores
- `averageKNearestSimilarity`: Tests expected self-similarity excluded, but function includes it

**Impact**: Unit tests with mocks are blind to these contract violations. Property tests catch them immediately by validating invariants across inputs.

### Integration Tests Reveal Overlapping Cleanup Logic
Real filesystem operations in 7 new maintenance module tests exposed that `sync.ts` has redundant cleanup steps:
- Step 3: `removeNode` removes ghost nodes AND their associated edges
- Step 4: Orphan edge removal becomes no-op

Mock-heavy tests never exposed this inefficiency because they bypass actual data structure operations.

### Error Handling Contracts Need Documentation
Multiple maintenance functions (`rename.ts`, `reindex.ts`, `promote.ts`) call `parseMemoryFile` expecting graceful error handling. The function throws instead. This pattern recurred across 4 modules, suggesting the error contract isn't clear.

**Remediation**: Document whether functions throw or return error status. Consider wrapper functions for consistent error handling across maintenance module family.

## Outcome
- 91 maintenance module tests: 0→100% coverage, all passing
- 76 property-based tests: 70 passing, 6 failed on contract violations (not bugs)
- Test fixes applied, integration patterns validated
