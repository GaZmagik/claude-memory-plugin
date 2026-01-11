#!/usr/bin/env bun
/**
 * UserPromptSubmit: Remind Claude to use memory think for documented chain-of-thought
 *
 * Since extended thinking mode is disabled, this reinforces the use of
 * `memory think` for deliberation on complex decisions.
 */

import { runHook, allowWithOutput } from '../src/core/error-handler.ts';

const REMINDER = `💭 For complex decisions, trade-offs, or deliberations, use \`memory think\` to document your chain-of-thought:
  • \`memory think create "Topic"\` → Start deliberation
  • \`memory think add/counter/branch "Thought"\` → Build reasoning
  • \`memory think conclude "Text" --promote <type>\` → Finalise (types: decision, learning, gotcha, artifact)`;

runHook(async () => {
  return allowWithOutput(REMINDER);
});
