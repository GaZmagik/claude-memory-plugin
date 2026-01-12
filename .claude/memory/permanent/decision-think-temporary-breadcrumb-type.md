---
id: decision-think-temporary-breadcrumb-type
title: Think documents stored as Breadcrumb type in temporary/ directory
type: decision
project: claude-memory-plugin
created: "2026-01-12T10:45:00.000Z"
updated: "2026-01-12T22:02:47.186Z"
tags:
  - think
  - storage
  - decision
  - feature-001
  - typescript
severity: medium
---

Think documents are classified as `MemoryType.Breadcrumb` and stored in `temporary/` directory.

Rationale:
- Breadcrumbs are ephemeral navigation markers (appropriate for thinking documents)
- Temporary directory keeps them separate from permanent memories
- When concluded and promoted, new memory is created in permanent/ (not moved)
- Original think document remains as record of deliberation process

Alternatives considered:
- Custom type (adds complexity, breaks existing type taxonomy)
- Permanent type initially (violates concept that think is ephemeral)
