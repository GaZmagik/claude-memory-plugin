---
id: learning-provider-cli-startup-timeout-requires-120s-not-30s
title: Provider CLI startup timeout requires 120s not 30s
type: learning
scope: project
created: "2026-01-26T16:42:18.814Z"
updated: "2026-01-26T16:42:18.814Z"
tags:
  - provider
  - timeout
  - cli
  - project
---

Provider CLI processes need 120s timeout for initial startup, not 30s. Short timeout causes spurious failures. Discovered through timeout/unavailable provider testing.
