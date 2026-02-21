---
id: learning-external-nodes-excluded-from-semantic-search-due-to-missing-filepath
title: External nodes excluded from semantic search due to missing filePath
type: learning
scope: project
created: "2026-02-21T03:54:12.620Z"
updated: "2026-02-21T03:54:12.620Z"
tags:
  - search
  - external-files
  - embeddings
  - project
---

Search skips embeddings lookup if filePath can't be constructed. External nodes have externalPath but code only checked filePath. Search indexing in loadEmbeddings checks !embedding.filePath before skipping—need to also check externalPath exists.
