---
id: learning-yaml-block-scalar-indentation-in-github-actions-requires-proper-nesting
title: YAML block scalar indentation in GitHub Actions requires proper nesting
type: learning
scope: project
created: "2026-01-24T14:15:09.786Z"
updated: "2026-01-24T14:15:09.786Z"
tags:
  - yaml
  - github-actions
  - shell-scripting
  - project
---

Lines within 'run: |' block scalar in YAML must be indented to stay within the block. Unindented lines are parsed as new YAML keys, causing **prefix to be interpreted as alias syntax. Use printf or proper YAML string concatenation to avoid leading spaces in generated output.
