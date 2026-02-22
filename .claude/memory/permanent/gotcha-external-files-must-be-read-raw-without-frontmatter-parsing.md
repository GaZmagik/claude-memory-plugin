---
id: gotcha-external-files-must-be-read-raw-without-frontmatter-parsing
title: External files must be read raw without frontmatter parsing
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-21T05:31:24.522Z"
updated: "2026-02-21T05:32:14.364Z"
tags:
  - external-nodes
  - search
  - frontmatter
  - project
---

External files (CLAUDE.md, rules, reminders) are plain markdown without frontmatter. Search was calling parseMemoryFile() on them, throwing errors on missing delimiters. Fix: detect externalPath and read raw file content instead.
