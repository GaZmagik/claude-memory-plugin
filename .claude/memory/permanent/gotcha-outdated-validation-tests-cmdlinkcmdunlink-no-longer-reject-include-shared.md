---
id: gotcha-outdated-validation-tests-cmdlinkcmdunlink-no-longer-reject-include-shared
title: "Outdated validation tests: cmdLink/cmdUnlink no longer reject --include-shared"
type: gotcha
scope: project
created: "2026-02-06T21:46:58.663Z"
updated: "2026-02-06T21:46:58.663Z"
tags:
  - project
---

Two pre-existing tests (cmdLink, cmdUnlink reject --include-shared) were written for the old regime where cross-scope linking was forbidden. In Phase D, cross-scope is the entire point. Tests updated to verify cross-scope linking works (triggered via --target-agent, not --include-shared). Found and fixed before full suite run.
