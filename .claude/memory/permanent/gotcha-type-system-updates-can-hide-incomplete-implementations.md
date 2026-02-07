---
id: gotcha-type-system-updates-can-hide-incomplete-implementations
title: Gotcha - Type system updates can hide incomplete implementations
type: gotcha
scope: project
created: "2026-02-03T22:32:15.982Z"
updated: "2026-02-03T22:32:15.982Z"
tags:
  - retrospective
  - process
  - types
  - project
severity: medium
---

We added `agent` field to BaseRequest which automatically made all request types accept agent. This was elegant but masked that some request types (SyncRequest, CheckHealthRequest) didn't initially have the field. Solution: When centralizing type changes, explicitly audit all subtypes and storage handlers. Add a verification step like 'grep -r "agent:" src/ to ensure field is actually used.
