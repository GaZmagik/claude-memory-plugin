---
id: learning-metadata-preservation-requires-explicit-timestamp-passing
title: Metadata preservation requires passing created/updated timestamps to writeMemory
type: learning
scope: agent-project
project: claude-memory-plugin
updated: "2026-02-16T22:30:07.425Z"
tags:
  - import
  - metadata
  - timestamps
  - preservation
---

Import operations must pass created, updated, and links fields explicitly to writeMemory(). Without these fields in WriteMemoryRequest, writeMemory generates new timestamps, losing original metadata. This required extending WriteMemoryRequest interface with optional created/updated fields and updating createFrontmatter() to accept and use these parameters when provided.
