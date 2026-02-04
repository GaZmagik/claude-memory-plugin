---
id: learning-retro-test-assertion-format-mismatches-dont-indicate-failure-check-whats-actually-preserved
title: Retro - Test assertion format mismatches don't indicate failure - check what's actually preserved
type: learning
scope: project
created: "2026-02-04T21:17:51.281Z"
updated: "2026-02-04T21:17:51.281Z"
tags:
  - retrospective
  - process
  - testing
  - copy-agent-implementation
  - project
severity: medium
---

Three copy.spec.ts tests were failing with 'Expected to contain inline array' errors. Initial assumption was that metadata wasn't being preserved. Investigation revealed metadata (timestamps, links, tags) WERE being correctly preserved - just serialized in YAML multi-line format instead of inline format. Lesson: When test failures look like data loss, verify what the test is actually checking. The assertion format may be wrong, not the implementation.
