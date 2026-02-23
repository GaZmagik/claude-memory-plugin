---
id: decision-file-size-refactoring-candidates-identified
title: "Identified refactoring candidates: command-help.ts (902 lines) and refresh-frontmatter.spec.ts (934 lines)"
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-23T11:36:12.676Z"
updated: "2026-02-23T11:36:40.916Z"
tags:
  - refactoring
  - code-quality
  - file-size
  - technical-debt
  - project
---

Both files exceeded 900-line threshold. command-help.ts is a source file with only 2 external consumers (minimal blast radius), making it ideal for extraction. refresh-frontmatter.spec.ts is a test file that can be split by test behaviour naturally. Deferred actual refactoring pending separate planning phase.
