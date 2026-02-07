---
id: gotcha-cli-test-positional-array-structure
title: CLI Test Positional Array Structure
type: gotcha
scope: project
created: "2026-02-04T16:57:27.682Z"
updated: "2026-02-04T16:57:27.682Z"
tags:
  - testing
  - phase-d
  - cli
  - project
---

CLI command tests must NOT include command name in positional arrays. Wrong: {positional: ['search', 'query']} → Right: {positional: ['query']}. Parser strips command name before calling handlers. This caused 6 initial Phase D test failures.
