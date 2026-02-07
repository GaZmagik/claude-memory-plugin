---
id: gotcha-retro-embeddings-generation-design-not-obviously-documented
title: Retro - Embeddings generation design not obviously documented
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-18T10:34:40.588Z"
updated: "2026-02-01T22:38:06.219Z"
tags:
  - retrospective
  - process
  - documentation
  - embeddings
  - memory-skill
  - project
severity: medium
---

Feature design: embeddings.json is not auto-generated. Users must explicitly run `memory write --auto-link` (per-memory) or `memory refresh --embeddings` (batch). This was not obvious from code/docs. User discovered it through investigation rather than documentation. When rebuilding global scope, 73 embeddings generated successfully once refresh --embeddings was invoked. Recommend: document embeddings generation strategy in README and help text for refresh command.
