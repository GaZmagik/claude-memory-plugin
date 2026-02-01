---
id: artifact-meeting-template-yaml-schema-design
title: Meeting template YAML schema design
type: artifact
scope: project
created: "2026-01-31T07:38:25.470Z"
updated: "2026-01-31T07:38:25.470Z"
tags:
  - meeting-command
  - yaml
  - schema
  - template
  - v1.3.0
  - project
severity: low
---

Recommended structure: version/name/description metadata, participants array (style/agent + role), agenda topics with questions, format config (execution mode, timeouts, limits), output config (promotion rules). Validate with Zod schema. Version field enables schema evolution. Safety: timeout_per_agent and max_agents prevent runaway costs.
