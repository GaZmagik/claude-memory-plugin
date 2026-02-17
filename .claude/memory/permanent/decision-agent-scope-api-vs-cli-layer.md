---
id: decision-agent-scope-api-vs-cli-layer
title: Separate agent scope API validation from CLI sanitisation
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-02T22:46:39.410Z"
updated: "2026-02-16T22:30:07.499Z"
tags:
  - project
---

Agent scope system separates API (strict validation) from CLI (user-friendly sanitisation). API rejects invalid names and suggests sanitised version in error. CLI sanitises automatically. This prevents API abuse while maintaining UX.
