---
id: learning-millisecond-precision-required-for-rapid-timestamp-based-id-generation
title: Millisecond precision required for rapid timestamp-based ID generation
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-12T20:02:49.071Z"
updated: "2026-01-16T23:10:43.887Z"
tags:
  - id-generation
  - timestamps
  - performance
  - retro
  - project
---

## Learning: Timer Granularity in ID Schemes

When generating IDs based on timestamps (especially think documents), second-precision is insufficient if operations can occur in the same second.

### Context
Think document IDs use format `think-YYYYMMDD-HHMMSS`. When creating multiple documents rapidly in tests or automation, same-second IDs collide and overwrite each other.

### Solution
Upgrade to millisecond precision: `think-YYYYMMDD-HHMMSSmmm`. Allows 1000 unique IDs per second instead of 1.

### Applicability
Relevant for any ID scheme that:
- Uses timestamps as part of generation
- Expects rapid creation in automated contexts
- Stores files with ID as filename (overwrites on collision)

Consider millisecond precision as baseline for timestamp-based IDs unless performance is critical.

### Impact
Prevented test suite requiring 1.1s delays between operations. Reduced test runtime significantly.
