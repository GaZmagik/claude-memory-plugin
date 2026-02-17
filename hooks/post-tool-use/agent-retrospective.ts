#!/usr/bin/env bun
/**
 * PostToolUse:Task Hook - Agent Retrospective
 *
 * Triggers after Task tool execution to prompt agents to capture learnings.
 * Uses multi-source agent detection and work classification to determine
 * whether to inject retrospective guidance.
 *
 * Performance target: <25ms execution
 */

import { detectAgent, extractSubagentType } from '../src/agent/detect-agent.js';
import { classifyWork, WorkSignificance } from '../src/agent/work-classifier.js';

interface HookInput {
  tool_name?: string;
  tool_input?: {
    args?: string;
    prompt?: string;
    subagent_type?: string;
  };
}

async function main() {
  try {
    // Read hook input from stdin
    const input = await Bun.stdin.text();
    if (!input || input.trim().length === 0) {
      process.exit(0);
    }

    const hookInput: HookInput = JSON.parse(input);

    // Only process Task tool calls
    if (hookInput.tool_name !== 'Task') {
      process.exit(0);
    }

    // Extract relevant data
    const args = hookInput.tool_input?.args;
    const prompt = hookInput.tool_input?.prompt ?? '';
    const subagentType = hookInput.tool_input?.subagent_type ?? extractSubagentType(args);

    // Detect agent identity
    const agentDetection = detectAgent(args);

    if (!agentDetection.detected) {
      // No agent detected, exit cleanly
      process.exit(0);
    }

    // Classify work significance
    const significance = classifyWork(subagentType, prompt);

    if (significance === WorkSignificance.Trivial) {
      // Trivial work, don't prompt for retrospective
      process.exit(0);
    }

    // Meaningful work by an agent - inject retrospective guidance
    const agentName = agentDetection.name;
    const message = `

📚 **Agent Retrospective Reminder**

You've completed meaningful work as **${agentName}**. Consider capturing key learnings:

**Quick Guide**: See \`/commands/agent-commit.md\` for the workflow, or:

1. **What did you learn?** (gotchas, patterns, decisions)
2. **Save it**:
   \`\`\`bash
   echo '{"type":"learning","title":"Brief title","content":"Description","tags":"tag1,tag2"}' | memory write --agent ${agentName} --auto-link
   \`\`\`

**Important**: Use \`--agent ${agentName}\` flag to save to your agent scope.

`;

    // Output as systemMessage to inject into conversation
    const output = {
      systemMessage: message,
    };

    console.log(JSON.stringify(output));
    process.exit(0);
  } catch (error) {
    // Log error for debugging but don't block tool execution
    console.error(`[agent-retrospective] Hook failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(0);
  }
}

main();
