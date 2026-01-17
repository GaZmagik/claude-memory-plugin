---
id: learning-retro-iterative-orphan-linking-with-semantic-validation-is-effective
title: Retro - Iterative orphan linking with semantic validation is effective
type: learning
scope: project
created: "2026-01-16T23:53:30.501Z"
updated: "2026-01-16T23:53:30.501Z"
tags:
  - retrospective
  - process
  - memory-operations
  - graph-health
  - project
severity: medium
---

Connecting 47→8 orphaned nodes (83% reduction) by repeatedly: (1) suggest-links to find candidates, (2) manually link based on semantic relevance, (3) validate stats, (4) repeat. Graph health improved from 74%→96% connectivity, e:n ratio 1.12→1.38. The suggest-links → manual-verify cycle caught that curator agent had already created some links, preventing duplicates. This pattern works well for cleanup phases.
