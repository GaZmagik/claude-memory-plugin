---
id: learning-dot-output-sanitisation-must-handle-backticks-for-mermaid-graphs
title: DOT output sanitisation must handle backticks for Mermaid graphs
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-21T12:52:29.611Z"
updated: "2026-02-21T12:52:44.024Z"
tags:
  - mermaid
  - security
  - output-sanitisation
  - project
---

Mermaid DOT node IDs require backtick escaping as HTML entities (&#96;). The escapeLabel() function needed backtick replacement to prevent syntax errors in graph rendering.
