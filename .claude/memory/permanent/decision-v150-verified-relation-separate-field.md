---
id: decision-v150-verified-relation-separate-field
title: Store LLM-Verified Relation in Separate Field
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-17T08:01:49.767Z"
updated: "2026-02-17T08:02:05.379Z"
tags:
  - v1.5.0
  - architecture
  - llm-verification
  - edge-metadata
  - project
---

LLM link type verification (Feature 3) stores the model's suggested relation type in a separate verifiedRelation field alongside the original label. This preserves audit trail and allows review before promotion via update-edge --apply. Avoids lossy direct replacement of label, enables rollback or rejection of LLM suggestions.
