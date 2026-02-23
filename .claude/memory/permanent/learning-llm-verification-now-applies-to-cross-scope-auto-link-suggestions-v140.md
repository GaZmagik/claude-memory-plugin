---
id: learning-llm-verification-now-applies-to-cross-scope-auto-link-suggestions-v140
title: LLM verification now applies to cross-scope auto-link suggestions (v1.4.0+)
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-23T11:35:59.900Z"
updated: "2026-02-23T11:36:40.842Z"
tags:
  - suggest-links
  - cross-scope
  - llm-verification
  - improvement
  - project
---

Previously, cross-scope suggestions skipped LLM verification and always used auto-linked-by-similarity relation. The infrastructure supported it (StoreCrossScopeEdgeRequest.relation exists), but the implementation never extracted the verified relation. Fixed by moving LLM block above isCrossScope branch so verifiedRelation feeds into storeCrossScopeEdge. This improves cross-scope link quality to match same-scope standards.
