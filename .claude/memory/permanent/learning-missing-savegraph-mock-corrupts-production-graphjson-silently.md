---
id: learning-missing-savegraph-mock-corrupts-production-graphjson-silently
title: Missing saveGraph mock corrupts production graph.json silently
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-06T00:07:10.694Z"
updated: "2026-02-16T22:30:07.433Z"
tags:
  - testing
  - mocks
  - side-effects
  - project
---

Tests without saveGraph mock allow write operations to persist to actual graph.json file. Discovered during Phase E integration testing. Requires explicit mock or file cleanup.
