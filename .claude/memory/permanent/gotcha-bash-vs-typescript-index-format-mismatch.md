---
id: gotcha-bash-vs-typescript-index-format-mismatch
title: Bash vs TypeScript Index Format Mismatch
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-12T20:40:27.578Z"
updated: "2026-01-16T23:10:42.754Z"
tags:
  - gotcha
  - high
  - memory-plugin
  - migration
  - index
  - project
severity: high
---

Bash memory.sh uses absolute file paths in index.json; TypeScript expects relativePath. This caused TypeError [ERR_INVALID_ARG_TYPE] in search command when path.join() received undefined. Fixed with migration layer in loadIndex() that converts file→relativePath on load.
