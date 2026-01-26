---
id: gotcha-cli-think-commands-suppress-output-silently
title: CLI think commands suppress output silently
type: gotcha
scope: project
created: "2026-01-26T16:24:40.336Z"
updated: "2026-01-26T16:24:40.336Z"
tags:
  - cli
  - debugging
  - output-suppression
  - think
  - project
---

bun run skills/memory/src/cli/index.ts think add/show commands fail silently with no error output. Commands execute (files modified) but CLI returns without logging. Likely output stream redirection issue in entry point.
