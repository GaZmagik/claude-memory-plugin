---
id: learning-retro-systematic-file-level-mutation-audits-uncover-architectural-gaps
title: Retro - Systematic file-level mutation audits uncover architectural gaps
type: learning
scope: project
created: "2026-01-18T09:20:24.044Z"
updated: "2026-01-18T09:20:24.044Z"
tags:
  - project
severity: medium
---

Auditing all mutation operations (delete, archive, move, rename, bulk-delete, sync) for a specific concern (embeddings handling) revealed both inconsistencies AND missing features. By checking all related operations together, we found that semantic search lacks a generative mechanism - the gap only became visible through comprehensive coverage analysis. Recommend this approach for future design audits.
