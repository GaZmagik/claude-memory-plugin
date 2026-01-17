---
description: Initiate a multi-agent deliberation using memory think with optional automated agent/style invocations
argument-hint: "<topic> [--calls N] [--agents agent1,agent2] [--styles style1,style2]"
version: "1.0.0"
---

## User Input

```text
$ARGUMENTS
```

## Goal

Create a thinking document for structured deliberation on a topic, optionally invoking multiple agents with different output styles to gather diverse perspectives before concluding.

## Prerequisites

**CRITICAL**: Before running any memory commands, you MUST activate the memory skill first using the Skill tool:

```
Skill: memory
```

This ensures the skill is loaded and the `memory` CLI command is available (installed via `bun link`). Without this step, the commands below may not work correctly.

## Discovering Available Agents and Styles

To see which agents and output styles are available in your environment, run:

```bash
memory help think
```

This displays:
- **AVAILABLE AGENTS**: Domain experts like `curator`, `typescript-expert`, `security-code-expert`, etc.
- **AVAILABLE OUTPUT STYLES**: Personality styles like `Architect`, `Devils-Advocate`, `Pragmatist`, `Simplifier`, etc.

**Note**: Available agents and styles vary by installation. Always check `memory help think` for your specific environment.

## Execution Steps

### 1. Parse Arguments

Extract from `$ARGUMENTS`:
- **topic** (required): The deliberation topic (first positional argument or quoted string)
- **--calls N** (optional): Minimum number of agent calls to make before concluding (default: 0 = manual mode)
- **--agents a1,a2** (optional): Comma-separated list of required agents to invoke
- **--styles s1,s2** (optional): Comma-separated list of required styles to apply

**Examples**:
```
"Should we use Redis or PostgreSQL for caching?"
"API design for auth module" --calls 5 --agents typescript-expert,security-code-expert --styles Architect,Devils-Advocate
```

### 2. Create Thinking Document

```bash
memory think create "<topic>"
```

This creates a new thinking document and sets it as the current document for subsequent operations.

### 3. Add Initial Framing (Optional)

If the user provided context beyond just the topic, add an initial framing thought:

```bash
memory think add "Initial framing: <context from user>"
```

### 4. Determine Agent/Style Invocations

**If --calls specified with --agents and/or --styles**:

Distribute calls across the specified agents and styles. For each call, use the syntax:

```bash
memory think add|counter|branch "<prompt>" --call claude --agent <agent-type> --style <style-type>
```

**Key syntax**:
- `--call claude` - Required to invoke Claude for the thought
- `--agent <agent-type>` - Optional domain expert (e.g., `typescript-expert`, `curator`)
- `--style <style-type>` - Optional output style (e.g., `Architect`, `Devils-Advocate`)

**Thought types**:
- `add` - Add a supporting thought or analysis
- `counter` - Add a counter-argument or challenge
- `branch` - Add an alternative approach or direction

**If no --calls specified (manual mode)**:

Ask the user how they want to proceed using the AskUserQuestion tool:

```json
{
  "question": "How would you like to conduct this deliberation?",
  "header": "Deliberation mode",
  "options": [
    {"label": "Manual", "description": "I'll add thoughts myself using memory think add/counter/branch"},
    {"label": "Quick (3 calls)", "description": "Get 3 diverse perspectives then review"},
    {"label": "Thorough (6 calls)", "description": "Get 6 perspectives covering multiple angles"},
    {"label": "Custom", "description": "Specify number of calls and which agents/styles to use"}
  ],
  "multiSelect": false
}
```

**If "Custom" selected**, ask for number of calls using AskUserQuestion tool:

```json
{
  "question": "How many agent perspectives would you like?",
  "header": "Call count",
  "options": [
    {"label": "3 calls", "description": "Quick deliberation"},
    {"label": "5 calls", "description": "Moderate depth"},
    {"label": "8 calls", "description": "Thorough exploration"},
    {"label": "12+ calls", "description": "Comprehensive multi-agent analysis"}
  ],
  "multiSelect": false
}
```

### 5. Execute Agent Calls

For automated calls, use a balanced distribution:

**Recommended pattern for N calls**:
1. First call: `add` with Architect style (frame the problem)
2. Middle calls: Mix of `add`, `counter`, `branch` with varied styles
3. Include at least one `counter` with Devils-Advocate or Risk-Assessor
4. Include at least one `branch` with Simplifier or Pragmatist

**Example for 5 calls on "API authentication approach"**:

```bash
# 1. Frame the architectural options
memory think add "What are the main architectural approaches and trade-offs for API authentication?" --call claude --style Architect

# 2. Challenge assumptions
memory think counter "What could go wrong with each approach? What are we missing?" --call claude --style Devils-Advocate

# 3. Implementation perspective (if agent available)
memory think add "What are the practical implementation considerations?" --call claude --agent typescript-expert --style Pragmatist

# 4. Security perspective (if agent available)
memory think counter "What are the security implications and attack vectors?" --call claude --agent security-code-expert --style Risk-Assessor

# 5. Simplification perspective
memory think branch "What's the simplest approach that still solves the core problem?" --call claude --style Simplifier
```

**Prompts should**:
- Reference the topic and existing thoughts (the system includes full context automatically)
- Ask specific questions relevant to the thought type (add/counter/branch)
- Guide the agent toward their expertise

### 6. Show Deliberation State

After all calls complete (or periodically during manual mode), show the current state:

```bash
memory think show
```

Present a summary to the user:
- Number of thoughts added
- Distribution of thought types
- Key perspectives covered
- Emerging themes or consensus

### 7. Conclude Deliberation

**If --conclude specified or user requests conclusion**:

Ask how to conclude using AskUserQuestion tool:

```json
{
  "question": "How would you like to conclude this deliberation?",
  "header": "Conclusion",
  "options": [
    {"label": "Synthesise and promote", "description": "Create a summary and save as permanent memory"},
    {"label": "Keep deliberating", "description": "Add more perspectives before concluding"},
    {"label": "Discard", "description": "Delete without saving - the discussion was valuable but no record needed"}
  ],
  "multiSelect": false
}
```

**If promoting**, ask for type using AskUserQuestion tool:

```json
{
  "question": "What type of memory should this become?",
  "header": "Memory type",
  "options": [
    {"label": "Decision", "description": "An architectural or design choice with rationale"},
    {"label": "Learning", "description": "An insight or principle discovered through deliberation"},
    {"label": "Gotcha", "description": "A warning or pitfall to avoid"},
    {"label": "Artifact", "description": "A reusable pattern or reference"}
  ],
  "multiSelect": false
}
```

Then conclude:

```bash
memory think conclude "<synthesised conclusion text>" --promote <type>
```

The conclusion should:
- Summarise the key insights from all perspectives
- State the recommendation or decision clearly
- Note any important caveats or dissenting views

### 8. Report Outcome

Output a summary:

```markdown
## Deliberation Complete

**Topic**: <topic>
**Perspectives gathered**: N thoughts (X add, Y counter, Z branch)
**Outcome**: Promoted to <type>: <memory-id>

**Key insights**:
- <insight 1>
- <insight 2>
- <insight 3>
```

## Quick Reference

### Core Commands

| Command | Description |
|---------|-------------|
| `memory think create "<topic>"` | Start new deliberation |
| `memory think add "<thought>"` | Add supporting thought |
| `memory think counter "<thought>"` | Add counter-argument |
| `memory think branch "<thought>"` | Add alternative approach |
| `memory think show` | Display current deliberation |
| `memory think list` | List all thinking documents |
| `memory think conclude "<text>" --promote <type>` | Conclude and save |

### AI Invocation Syntax

```bash
memory think add|counter|branch "<prompt>" --call claude [--agent <agent>] [--style <style>]
```

- `--call claude` - Required to invoke AI
- `--agent <agent>` - Domain expert (run `memory help think` for list)
- `--style <style>` - Output personality (run `memory help think` for list)

### Recommended Style Pairings

| Purpose | Suggested Styles |
|---------|------------------|
| Frame problem | Architect, Product-Manager |
| Challenge assumptions | Devils-Advocate, Risk-Assessor |
| Find simpler path | Simplifier, Pragmatist |
| User perspective | User-Advocate |
| Historical context | Historian |
| Implementation focus | Pragmatist + domain agent |

## Notes

- Each `--call` invocation receives the full deliberation context (all previous thoughts)
- Agents and styles can be combined: `--agent typescript-expert --style Devils-Advocate`
- Run `memory help think` to discover available agents and styles in your environment
- Thinking documents live in `temporary/` and are meant to be concluded and promoted
- The `--promote` flag converts the conclusion to a permanent memory (decision, learning, gotcha, or artifact)
