---
id: learning-provider-integration-incomplete-in-v110
title: Provider integration incomplete in v1.1.0
type: learning
scope: project
created: "2026-01-26T07:20:41.975Z"
updated: "2026-01-26T07:20:41.975Z"
tags:
  - v1.1.0
  - provider-routing
  - bug
  - incomplete-feature
  - project
---

The --call codex and --call gemini flags parse correctly but invokeAI() always calls executeClaudeCli() instead of routing to invokeProvider(). The provider routing plumbing exists (buildCodexCommand, buildGeminiCommand) but AICallOptions lacks a provider field and invokeAI never checks it. All --call invocations silently fall back to Claude/haiku.
