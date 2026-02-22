---
id: gotcha-mock-embeddings-test-mismatch-on-actual-api-input
title: mock-embeddings-test-mismatch-on-actual-api-input
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-20T22:00:10.725Z"
updated: "2026-02-20T22:00:33.188Z"
tags:
  - testing
  - mocking
  - embeddings
  - api-integration
  - project
---

Mock embedding tests must return embeddings with correct dimensions matching actual API. If mock returns wrong shape/size, tests pass but real code fails. Always verify mock shape matches actual provider (e.g., 1536 dims for OpenAI).
