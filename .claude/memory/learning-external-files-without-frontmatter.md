---
type: learning
title: External files require special parsing without frontmatter
tags: feature-005, external-nodes, frontmatter, parsing, implementation
---

CLAUDE.md and agent MEMORY.md lack YAML frontmatter. readMemory (T119) was updated to detect externalPath in index entries and construct frontmatter from metadata instead of parsing it, preventing parse errors on rule/reminder files.
