---
id: decision-accord-plugin-daemon-plus-plugin-split-with-memory-canonical-state
title: Accord plugin uses daemon + plugin split with memory as canonical state
type: decision
scope: project
created: "2026-01-30T17:24:21.205Z"
updated: "2026-01-30T17:24:21.205Z"
tags:
  - architecture
  - accord-plugin
  - autonomous-agents
  - daemon-pattern
  - memory-integration
  - project
---

Accord plugin (autonomous agent orchestration) will use daemon + plugin split architecture: Bun/Node daemon handles scheduling and credential management, thin Claude Code plugin provides memory scope integration and dashboard comms. Memory plugin becomes canonical state store (no shadow .state.json files). Agents use memory plugin with --memory-scope=agent:name for isolation. Dashboard queries agent active memory think for real-time reasoning.
