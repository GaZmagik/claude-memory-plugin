---
id: artifact-cross-scope-link-api-contract
title: Cross-Scope Link API Contract
type: artifact
scope: project
project: claude-memory-plugin
created: "2026-02-06T21:01:03.600Z"
updated: "2026-02-16T22:30:07.574Z"
tags:
  - phase-d
  - api
  - cross-scope
  - link
  - project
---

LinkMemoriesRequest/UnlinkMemoriesRequest extended with: targetAgent?, targetBasePath?, sourceScope?, targetScope?, sourceAgent?. Detection logic: if targetBasePath or targetAgent present, delegate to storeCrossScopeEdge()/removeCrossScopeEdge(). CLI parses --target-agent flag, detects cross-scope scenario, resolves both basePaths, passes metadata to linkMemories().
