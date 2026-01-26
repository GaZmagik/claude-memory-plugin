---
id: gotcha-feature-and-core-hubs-detected-but-dont-exist-yet-linking-fails-silently
title: Feature and core hubs detected but don't exist yet - linking fails silently
type: gotcha
scope: project
created: "2026-01-25T16:27:00.338Z"
updated: "2026-01-25T16:27:00.338Z"
tags:
  - memory
  - hubs
  - linking
  - project
---

Hub detection succeeds (hubs are referenced in working code) but actual hub memories may not be created yet. Linking reports errors but continues gracefully. Re-link after hubs are formally established.
