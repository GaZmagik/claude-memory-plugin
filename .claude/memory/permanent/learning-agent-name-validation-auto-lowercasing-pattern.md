---
id: learning-agent-name-validation-auto-lowercasing-pattern
title: Agent name validation auto-lowercasing pattern
type: learning
scope: project
created: "2026-02-04T19:58:45.249Z"
updated: "2026-02-04T19:58:45.249Z"
tags:
  - validation
  - agent-operations
  - naming
  - pattern
  - project
---

Agent names auto-lowercase during creation (TypeScript-Expert → typescript-expert) but invalid characters are rejected upfront, not silently sanitised. Validation happens before directory creation to fail fast.
