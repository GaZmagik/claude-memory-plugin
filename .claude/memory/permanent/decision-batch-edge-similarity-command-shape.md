---
id: decision-batch-edge-similarity-command-shape
title: "Batch edge similarity: flag on refresh vs new command"
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-23T21:46:00.898Z"
updated: "2026-02-23T21:46:06.891Z"
tags:
  - CLI shape
  - batch operations
  - memory refresh
  - feature design
  - project
---

Decided to add --score-edges, --verify, --apply, --force to existing memory refresh command rather than create new memory score-edges command.

Rationale: Aligns with existing pattern (refresh already has --embeddings, --frontmatter flags). Batch operations logically group with maintenance. Keeps CLI surface smaller. Memory refresh is idempotent, so adding flags fits semantics.

Plan documented in .claude/plans/magical-hugging-boole.md
