---
id: learning-plugin-relative-discovery-requires-importmetaurl-not-processcwd
title: Plugin-relative discovery requires import.meta.url not process.cwd
type: learning
scope: project
created: "2026-01-24T14:15:03.083Z"
updated: "2026-01-24T14:15:03.083Z"
tags:
  - plugin-architecture
  - esm
  - discovery
  - node.js
  - project
---

When discovering plugin resources (styles, agents, commands), using process.cwd() fails if the command runs from user project directory. Must use import.meta.url to resolve actual plugin installation path. Critical for bundled plugin resources.
