---
id: gotcha-retro-embeddings-generation-is-not-implemented-in-semantic-search-api
title: Retro - Embeddings generation is not implemented in semantic search API
type: gotcha
scope: project
created: "2026-01-18T09:20:18.527Z"
updated: "2026-01-18T09:20:18.527Z"
tags:
  - project
severity: high
---

The semantic search command only searches existing embeddings in embeddings.json - it does NOT generate embeddings for memories lacking them. This is unintuitive; users expect semantic search to populate embeddings on first invocation. Legacy memories have no embeddings. A rebuild-embeddings command is needed to batch-generate embeddings for existing collections. This gap affects all scopes (project, local, global).
