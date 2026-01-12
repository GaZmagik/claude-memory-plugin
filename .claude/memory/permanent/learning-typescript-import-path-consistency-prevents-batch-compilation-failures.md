---
id: learning-typescript-import-path-consistency-prevents-batch-compilation-failures
title: TypeScript import path consistency prevents batch compilation failures
type: permanent
scope: local
project: claude-memory-plugin
created: "2026-01-10T19:58:47Z"
updated: "2026-01-12T22:02:47.187Z"
tags:
  - retrospective
  - process
  - typescript
  - build-system
  - lessons-learned
---

# Retrospective: Import Path Consistency

**Issue discovered**: Test files used inconsistent import paths:
- Some: `../../skills/memory/src/types/enums.js`
- Others: `../../../skills/memory/src/types/enums.js`

When Severity enum was added to tests en masse, only paths matching first pattern got fixed. Build then failed on 24 TypeScript errors.

**Root cause**: No convention established in Phase 1. Tests grew organically.

**Fix applied**: Standardised all test imports to 3-level `../../../` pattern. Batch sed applied successfully.

**Recommendation**: Establish import path convention in tsconfig.json baseUrl aliases (e.g., `@skills/memory/src`) to eliminate fragility. Test in Phase 0 next time.
