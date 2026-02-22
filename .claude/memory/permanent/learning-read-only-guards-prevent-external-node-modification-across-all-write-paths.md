---
id: learning-read-only-guards-prevent-external-node-modification-across-all-write-paths
title: Read-only guards prevent external node modification across all write paths
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-19T11:03:07.662Z"
updated: "2026-02-19T11:03:33.271Z"
tags:
  - external-module
  - guards
  - architecture
  - pattern
  - project
---

Added guards to cmdWrite, cmdDelete, cmdRename, cmdMove, and cmdPromote to check index entries for externalPath attribute and reject modifications. External nodes (rules and reminders) are read-only - modifications must happen at source and be re-discovered on next sync.
