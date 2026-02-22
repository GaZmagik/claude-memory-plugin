---
id: learning-backend-filtering-automatically-benefits-cli-commands-without-duplication
title: Backend filtering automatically benefits CLI commands without duplication
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-19T13:24:42.906Z"
updated: "2026-02-19T13:25:37.168Z"
tags:
  - architecture
  - cli-design
  - data-filtering
  - project
---

When isExternalNode filter was added to auditMemories() backend function, the audit CLI commands automatically benefited without requiring separate CLI-level filtering. Backend constraints propagate to all consumers automatically—design filtering at data access layer, not presentation layer.
