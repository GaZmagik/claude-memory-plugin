---
id: learning-lightweight-spinner-for-long-running-cli-operations-avoids-dependencies
title: Lightweight spinner for long-running CLI operations avoids dependencies
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-25T16:27:00.149Z"
updated: "2026-02-01T22:38:07.015Z"
tags:
  - cli
  - ux
  - spinner
  - dependencies
  - typescript
  - project
---

For 10s+ operations like Ollama invocations, implement a simple stderr spinner using process.stderr.write() and '' overwrites instead of adding ora/nanospinner dependencies. Provides UX feedback without bloating package.json.
