---
id: learning-agent-invocation-marker-format-standardization-html-comment-syntax
title: Agent invocation marker format standardization - HTML comment syntax
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-06T07:30:02.372Z"
updated: "2026-02-16T22:30:07.530Z"
tags:
  - agent-scoping
  - markers
  - format-specification
  - project
---

Defined canonical marker format as HTML comment: <!-- agent:{agent-name} -->. Includes ABNF grammar, parsing regex, session caching strategy, and GraphNode enrichment requirements. Critical placement rules documented: must appear before first substantial content, persists across events via session cache.
