---
id: learning-parser-behaviour-tests-were-missing-only-export-checks-existed
title: Parser behaviour tests were missing - only export checks existed
type: learning
scope: project
created: "2026-01-26T16:42:22.825Z"
updated: "2026-01-26T16:42:22.825Z"
tags:
  - testing
  - parser
  - tdd
  - project
---

Before v1.1.1, parser tests only verified exports. No behaviour tests for parseCodexOutput, parseGeminiOutput, detectProvider. Edge cases revealed gaps and bugs in error paths.
