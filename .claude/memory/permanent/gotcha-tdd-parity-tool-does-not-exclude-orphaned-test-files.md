---
id: gotcha-tdd-parity-tool-does-not-exclude-orphaned-test-files
title: Gotcha - tdd-parity tool does not exclude orphaned test files
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-23T12:16:26.750Z"
updated: "2026-02-23T12:16:51.057Z"
tags:
  - retrospective
  - tdd-parity
  - tool-bug
  - testing
  - project
severity: high
---

The tdd-parity tool checks is_file_excluded() only for source files, not for test files marked as orphaned. This means legitimate feature test files (cross-scope, guard tests, integration specs) that span multiple source modules are incorrectly flagged as orphaned even if listed in .tddignore. Fix: Apply is_file_excluded() check to orphaned_test_files list at core.py line 210 before adding to report. Confirmed by successful patch that reduced orphaned reports from 82→71→45.
