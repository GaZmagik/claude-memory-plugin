---
id: learning-learning-duplicated-cli-helpers-hidden-in-10-command-files
title: Learning - Duplicated CLI helpers hidden in 10 command files
type: learning
scope: project
created: "2026-01-17T06:12:03.362Z"
updated: "2026-01-17T06:12:03.362Z"
tags:
  - retrospective
  - refactoring
  - code-quality
  - project
severity: medium
---

CLI command files (bulk, crud, graph, tags, query, quality, maintenance, suggest, think, utility) contained 10 identical copies of getGlobalMemoryPath(), getResolvedScopePath(), and parseScope(). Extracted to shared helpers.ts module. Pattern discovery: scan for function name repetition across file boundaries - often indicates copy-paste that went unnoticed for months. 1823 tests confirmed refactoring was safe.
