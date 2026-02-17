---
id: gotcha-phase-c-baserequest-type-mutation-adds-agent-field-to-all-request-types
title: Phase C BaseRequest type mutation adds agent field to all request types
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-03T22:32:49.820Z"
updated: "2026-02-16T22:30:06.865Z"
tags:
  - phase-c
  - type-system
  - gotcha
  - project
---

Adding agent field to BaseRequest extends ALL derived types (LinkMemoriesRequest, SyncRequest, CheckHealthRequest) automatically. Future request types inherit this automatically. Be aware when adding new request types - they will inherit agent field even if not explicitly documented.
