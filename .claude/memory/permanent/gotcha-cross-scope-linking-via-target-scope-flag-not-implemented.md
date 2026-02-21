---
id: gotcha-cross-scope-linking-via-target-scope-flag-not-implemented
title: Cross-scope linking via --target-scope flag not implemented
type: gotcha
scope: project
created: "2026-02-21T03:50:10.882Z"
updated: "2026-02-21T03:50:10.882Z"
tags:
  - cross-scope-linking
  - cli-design
  - incomplete-feature
  - project
---

CHANGELOG claimed --target-scope support for project↔global linking, but cmdLink only detects cross-scope via --agent/--target-agent flags. --target-scope is parsed but ignored in scope detection. Need to expand scopeA/scopeB detection logic in cmdLink to handle --scope/--target-scope.
