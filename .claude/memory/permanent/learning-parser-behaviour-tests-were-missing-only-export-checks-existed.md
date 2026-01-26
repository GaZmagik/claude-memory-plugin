---
id: learning-parser-behaviour-tests-were-missing-only-export-checks-existed
title: Parser behaviour tests were missing, only export checks existed
type: learning
scope: project
created: "2026-01-26T16:24:56.804Z"
updated: "2026-01-26T16:24:56.804Z"
tags:
  - testing
  - parser
  - test-coverage
  - tdd
  - project
---

parseCodexOutput and parseGeminiOutput had no tests for actual parsing behaviour (banner removal, separator stripping, etc). Added comprehensive behaviour tests covering edge cases like malformed output and multiple matches.
