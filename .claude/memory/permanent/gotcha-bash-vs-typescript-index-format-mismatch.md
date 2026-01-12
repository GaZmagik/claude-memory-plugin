---
type: gotcha
title: Bash vs TypeScript Index Format Mismatch
created: "2026-01-12T20:40:27.578Z"
updated: "2026-01-12T20:40:27.578Z"
tags:
  - gotcha
  - high
  - memory-plugin
  - migration
  - index
  - project
scope: project
severity: high
---

Bash memory.sh uses absolute file paths in index.json; TypeScript expects relativePath. This caused TypeError [ERR_INVALID_ARG_TYPE] in search command when path.join() received undefined. Fixed with migration layer in loadIndex() that converts file→relativePath on load.
