---
id: gotcha-baserequest-already-supports-agent-override
title: BaseRequest Already Supports Agent Override
type: gotcha
scope: project
created: "2026-02-06T20:43:57.982Z"
updated: "2026-02-06T20:43:57.982Z"
tags:
  - phase-d-deferred
  - cli
  - parser
  - project
---

While implementing cross-scope features, discovered BaseRequest interface already has optional agent? field and --target-agent flag parsing works in parser. Don't waste time adding these — they're already there. Same for all CLI command parsers.
