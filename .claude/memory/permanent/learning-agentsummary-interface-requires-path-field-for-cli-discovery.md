---
id: learning-agentsummary-interface-requires-path-field-for-cli-discovery
title: AgentSummary interface requires path field for CLI discovery
type: learning
scope: project
created: "2026-02-05T16:11:09.794Z"
updated: "2026-02-05T16:11:09.794Z"
tags:
  - phase-e
  - agent-discovery
  - cli
  - api-design
  - project
---

AgentSummary interface was missing the path field needed by agent discovery CLI commands. Adding path field to AgentSummary enables proper agent identification in CLI outputs and test assertions.
