#!/usr/bin/env bun
/**
 * SubagentStop: Extract Agent ID
 *
 * Writes a unique per-subagent temp file via the SubagentRegistry so that
 * concurrent subagents don't overwrite each other's entry. PostToolUse:Task
 * and SessionEnd consume these files to spawn agent-commit capture sessions.
 *
 * SubagentStop only exposes agent_id — agentType is unknown here, so entries
 * are written with agentType='subagent' as a neutral placeholder.
 */

import { runHook, allow } from '../src/core/error-handler.ts';
import { writeSubagentEntry } from '../src/agent/subagent-registry.ts';

interface SubagentStopInput {
  agent_id?: string;
  session_id?: string;
}

runHook(async (input) => {
  const hookInput = input as SubagentStopInput;
  const agentId = hookInput?.agent_id ?? '';

  if (agentId) {
    writeSubagentEntry(agentId, 'subagent', '');
  }

  return allow();
});
