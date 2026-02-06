---
id: gotcha-agent-context-serialisation-chain-propagation
title: "Agent context must survive full serialisation chain: TypeScript → JSON → subprocess stdin → parseHookInput"
type: gotcha
scope: project
created: "2026-02-06T08:03:35.250Z"
updated: "2026-02-06T08:03:35.250Z"
tags:
  - phase-g
  - hooks
  - agent-context
  - serialisation
  - testing
  - project
---

When Phase G implements agent context injection, the field must propagate through the complete chain: Claude Code creates HookInput object → serializes to JSON → writes to subprocess stdin → hook script deserializes via parseHookInput(). If ANY step doesn't include the field, context is lost. TypeScript interface is just the first validation gate. Test with end-to-end stdin round-trip (like hooks/src/core/types.spec.ts does) to catch breaks early.
