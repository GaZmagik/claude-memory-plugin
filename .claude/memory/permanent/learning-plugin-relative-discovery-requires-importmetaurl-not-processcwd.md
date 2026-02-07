---
id: learning-plugin-relative-discovery-requires-importmetaurl-not-processcwd
title: Plugin-relative discovery requires import.meta.url not process.cwd
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-24T14:15:03.083Z"
updated: "2026-02-01T22:38:06.480Z"
tags:
  - plugin-architecture
  - esm
  - discovery
  - node.js
  - project
---

When discovering plugin resources (styles, agents, commands), using process.cwd() fails if the command runs from user project directory. Must use import.meta.url to resolve actual plugin installation path. Critical for bundled plugin resources.
