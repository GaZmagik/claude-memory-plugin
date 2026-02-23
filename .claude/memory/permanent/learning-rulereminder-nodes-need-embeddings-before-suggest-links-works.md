---
id: learning-rulereminder-nodes-need-embeddings-before-suggest-links-works
title: Rule/reminder nodes need embeddings before suggest-links works
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-23T21:20:18.395Z"
updated: "2026-02-23T21:46:06.907Z"
tags:
  - suggest-links
  - rule
  - reminder
  - embeddings
  - external-files
  - project
---

Rule and reminder nodes (external file index, feature 005 / v1.6.0) are NOT filtered out of suggest-links candidate pool — they participate in similarity matching like any other node.

However, they require embeddings to appear in similarity results. When index-context runs without Ollama available, embeddingsGenerated=0, meaning rule/reminder nodes are silently excluded from suggest-links despite being indexed.

To enable suggest-links for rule/reminder nodes:
1. Ensure Ollama is running
2. Run: memory index-context --scope project
3. Then: memory suggest-links --auto-link

Verified by inspecting suggest-links.ts line 319 (only thought- prefix is filtered) and confirming embeddings.json had no entries for rule-project-security or rule-project-testing after index-context ran without Ollama.
