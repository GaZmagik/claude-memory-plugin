---
id: learning-external-files-without-frontmatter
title: External files require special parsing without frontmatter
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-22T10:23:07.861Z"
updated: "2026-02-22T10:26:20.888Z"
tags:
  - feature-005
  - external-nodes
  - frontmatter
  - parsing
  - implementation
  - project
---

CLAUDE.md and agent MEMORY.md lack YAML frontmatter. readMemory (T119) was updated to detect externalPath in index entries and construct frontmatter from metadata instead of parsing it, preventing parse errors on rule/reminder files.
