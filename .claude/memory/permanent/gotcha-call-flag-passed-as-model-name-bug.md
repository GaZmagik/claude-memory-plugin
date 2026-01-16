---
id: gotcha-call-flag-passed-as-model-name-bug
title: Feature review findings verification and fix planning
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-13T21:52:14.200Z"
updated: "2026-01-16T13:44:26.666Z"
tags:
  - promoted-from-think
  - project
---

# Feature review findings verification and fix planning

## Conclusion

The --call flag bug was caused by passing the flag value ('claude') as the model name instead of using a separate --model flag. Fix applied to think.ts:161,173 - now uses getFlagString(args.flags, 'model') which defaults to 'haiku' in the invoker. Verified working.

## Deliberation Trail

_Promoted from think document: `thought-20260113-214013346`_

### Thought

## Context

### Thought

## Agent Consultation Blocked

### Thought

Testing PATH environment

### Thought

## Bug Found: --call Flag Incorrectly Used as Model Name

### Thought (claude:haiku [e32bc46c-67e8-4d87-92b3-a851ea37d8e1])

The fix is correct. The code at lines 156-177 now properly handles the `--call` flag by extracting it separately using `getFlagString(args.flags, 'call')` and then checking if it exists before constructing the call configuration object. The `--model` flag is correctly parsed on line 161 and passed to the call object on line 173, not mistakenly used as a model name override.

### Thought

The --call flag bug was caused by passing the flag value ('claude') as the model name instead of using a separate --model flag. Fix applied to think.ts:161,173 - now uses getFlagString(args.flags, 'model') which defaults to 'haiku' in the invoker. Verified working.
