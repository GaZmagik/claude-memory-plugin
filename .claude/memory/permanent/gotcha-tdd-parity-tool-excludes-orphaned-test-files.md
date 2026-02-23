---
id: gotcha-tdd-parity-tool-excludes-orphaned-test-files
title: tdd-parity-tool-excludes-orphaned-test-files
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-23T12:16:37.418Z"
updated: "2026-02-23T12:16:50.927Z"
tags:
  - project
---

The tdd-parity tool's is_file_excluded() check only applies to source files, not test files. Orphaned test specs matching .tddignore are still flagged as orphaned. Fixed one-line in core.py to check exclusions before adding to orphaned_test_files.
