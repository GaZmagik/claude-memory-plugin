---
id: artifact-tdd-workflow-for-suggest-links-fixes-failing-test-extract-update-descriptions-verify
title: "TDD workflow for suggest-links fixes: failing test → extract → update descriptions → verify"
type: artifact
scope: project
project: claude-memory-plugin
created: "2026-02-23T11:36:20.764Z"
updated: "2026-02-23T11:36:40.850Z"
tags:
  - tdd
  - suggest-links
  - testing-pattern
  - workflow
  - project
---

Pattern used for cross-scope LLM verification fix: (1) Add failing test asserting desired behaviour; (2) Extract shared logic block above conditional branch; (3) Update stale test descriptions that contradict the fix; (4) Run full test suite to confirm no regressions. This workflow ensures test infrastructure drives changes and documentation stays accurate.
