---
id: learning-update-edge-command-integrates-ollama-for-semantic-relation-labels
title: update-edge command integrates Ollama for semantic relation labels
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-19T06:33:10.487Z"
updated: "2026-02-19T06:33:18.765Z"
tags:
  - update-edge
  - CLI
  - ollama-integration
  - edge-metadata
  - project
---

The update-edge --verify flag invokes Ollama to suggest better relation labels (graceful fallback if unavailable). This was undocumented in help text. The --verify and --apply flags are mutually exclusive — --verify is read-only analysis, --apply commits changes. Cross-scope examples require --target-agent (not --target-scope).
