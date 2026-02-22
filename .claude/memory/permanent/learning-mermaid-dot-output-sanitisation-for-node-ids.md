---
id: learning-mermaid-dot-output-sanitisation-for-node-ids
title: Mermaid DOT output sanitisation for node IDs
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-21T12:23:47.323Z"
updated: "2026-02-21T12:24:05.777Z"
tags:
  - project
---

Apply sanitiseId() to all node IDs in DOT output to prevent special characters from breaking graph syntax. Existing escapeLabel() handles quotes/brackets in labels; sanitiseId() specifically handles Mermaid-unsafe characters in node identifiers.
