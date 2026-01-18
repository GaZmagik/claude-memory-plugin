---
id: learning-strip-deliberation-trail-from-promoted-think-memories
title: Strip deliberation trail from promoted think memories
type: learning
scope: project
created: "2026-01-16T18:17:09.180Z"
updated: "2026-01-16T18:17:09.180Z"
tags:
  - think
  - promotion
  - embeddings
  - memory-system
  - project
---

Promoted think memories now only include the conclusion, not the full deliberation trail. This keeps promoted memories concise and embeddable (under 6000 chars). The original think document in temporary/ is preserved for full deliberation reference. Changed buildPromotedContent() in conclude.ts to strip thoughts array and only emit conclusion + document ID reference.
