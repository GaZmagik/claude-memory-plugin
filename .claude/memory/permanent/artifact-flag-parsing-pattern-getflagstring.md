---
id: artifact-flag-parsing-pattern-getflagstring
title: "Flag parsing pattern: getFlagString(args.flags, 'flagName')"
type: artifact
scope: project
created: "2026-01-25T12:38:10.980Z"
updated: "2026-01-25T12:38:10.980Z"
tags:
  - cli-patterns
  - flag-parsing
  - t019
  - project
---

When parsing CLI flags in think.ts and other commands, use getFlagString(args.flags, 'flagName') pattern rather than passing flags as variable names. This prevents bugs where flag values are misinterpreted as model names or other parameters. Applied in T019 integration.
