---
id: gotcha-retro-help-system-broken-for-subcommands
title: Retro - Help system broken for subcommands
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-16T14:42:00.372Z"
updated: "2026-01-16T18:04:44.533Z"
tags:
  - retrospective
  - process
  - usability
  - memory-cli
  - project
  - gotcha
severity: low
---

The `memory help <subcommand>` returns generic help text instead of command-specific documentation. Example: `memory help refresh` doesn't explain the --embeddings flag. This makes feature discovery terrible. Fix: either implement proper subcommand help routing or document all flags in the generic help.
