---
id: learning-graph-edge-stores-label-not-relation
title: graph-edge-stores-label-not-relation
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-06T08:20:07.788Z"
updated: "2026-02-16T22:30:07.180Z"
tags:
  - graph
  - links
  - memory-api
  - frontmatter
  - project
---

linkMemories() accepts 'relation' as a parameter for the semantic relationship, but stores it as 'label' in the graph edge structure. When reading graph.json, access the field as edge.label, not edge.relation.
