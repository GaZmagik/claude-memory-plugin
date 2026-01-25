---
id: gotcha-missing-export-causes-test-import-cascade-failures
title: Missing export causes test import cascade failures
type: gotcha
scope: project
created: "2026-01-25T23:21:53.904Z"
updated: "2026-01-25T23:21:53.904Z"
tags:
  - exports
  - imports
  - testing
  - v1.1.0
  - project
---

test-heuristic-speed.spec.ts imported non-existent KEYWORD_RULES export from heuristics.ts. Test passed alone but failed in full suite due to import-time error cascading to other test files. Solution: export HEURISTIC_RULES constant and fix import names (matchKeywords -> matchHeuristics).
