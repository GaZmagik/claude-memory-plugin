---
id: learning-hub-threshold-tuning-affects-memory-connectivity-scoring
title: Hub threshold tuning affects memory connectivity scoring
type: learning
scope: project
created: "2026-02-05T23:25:01.035Z"
updated: "2026-02-05T23:25:01.035Z"
tags:
  - phase-e
  - stats
  - health-scoring
  - project
---

Reduced hub threshold from 3 to 2 connections in cmdStats to accommodate smaller test graphs. Hub detection is sensitive to graph scale - larger graphs benefit from higher thresholds, smaller test graphs require lower thresholds for meaningful connectivity analysis.
