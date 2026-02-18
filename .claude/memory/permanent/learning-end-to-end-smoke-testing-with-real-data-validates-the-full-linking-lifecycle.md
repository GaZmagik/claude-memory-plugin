---
id: learning-end-to-end-smoke-testing-with-real-data-validates-the-full-linking-lifecycle
title: End-to-end smoke testing with real data validates the full linking lifecycle
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-18T18:11:18.453Z"
updated: "2026-02-18T18:11:45.681Z"
tags:
  - smoke-test
  - linking
  - ollama
  - validation
  - project
---

suggest-links with --llm-type created 20 edges with similarity field, 2 got verifiedRelation from Ollama. Then update-edge --verify (graceful timeout), then --apply (promoted label, field cleaned). Real graph: 707 nodes, 1560→1560 edges. Proved --llm-type flag works and graceful degradation holds.
