---
id: learning-retro-batch-sed-replacement-vastly-more-efficient-than-incremental-editing
title: Retro - Batch sed replacement vastly more efficient than incremental editing
type: learning
scope: project
created: "2026-01-18T05:09:24.093Z"
updated: "2026-01-18T05:09:24.093Z"
tags:
  - retrospective
  - process
  - tooling
  - refactoring
  - project
severity: medium
---

When fixing widespread type errors across many similar files (e.g., test files with branded ID literals), using sed patterns to bulk-replace across the entire set is orders of magnitude faster than incremental manual edits. Reduced 172 TypeScript errors to 0 via systematic passes: (1) add imports, (2) replace string IDs, (3) fix mock returns. Each pass took seconds on 30+ files.
