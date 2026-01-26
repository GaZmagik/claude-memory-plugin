---
id: gotcha-ollama-startup-latency-on-first-model-use-affects-feature-perception
title: Ollama startup latency on first model use affects feature perception
type: gotcha
scope: project
created: "2026-01-24T22:31:47.070Z"
updated: "2026-01-24T22:31:47.070Z"
tags:
  - v1.1.0
  - ollama
  - "--auto"
  - performance
  - UX
  - project
---

First calls to ollama can take 10s+ if model isn't warm (cold start). Subsequent calls on same model are sub-second. Feature needs to show spinner for first invocation, or document expected latency. Users might think feature is broken if they see 10s hang on first --auto call.
