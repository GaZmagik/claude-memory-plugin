---
type: learning
title: Metadata preservation requires passing created/updated timestamps to writeMemory
tags: [import, metadata, timestamps, preservation]
scope: agent-project
---

Import operations must pass created, updated, and links fields explicitly to writeMemory(). Without these fields in WriteMemoryRequest, writeMemory generates new timestamps, losing original metadata. This required extending WriteMemoryRequest interface with optional created/updated fields and updating createFrontmatter() to accept and use these parameters when provided.
