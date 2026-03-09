---
id: gotcha-empty-string-tags-bug-from-split-without-filtering
title: Empty string tags bug from split without filtering
type: gotcha
scope: project
created: "2026-03-08T21:21:52.887Z"
updated: "2026-03-08T21:21:52.887Z"
tags:
  - string-parsing
  - filtering
  - data-cleaning
  - 006-memory-summarize
  - project
---

String.split(',').map(t => t.trim()) leaves empty strings when input contains only whitespace. Fixed with .filter(Boolean). Discovered during PR review when analysing tag normalisation logic. Classic gotcha affecting search and indexing.
