# CLI Flags Contract

**Feature**: 002-v1.1.0-enhancements
**Purpose**: Define new CLI flags and their behaviour
**Created**: 2026-01-24

---

## New CLI Flags

### --auto

**Description**: Enable intelligent agent/style/model selection using AI or heuristics

**Usage**:
```bash
memory think add <content> --auto [--non-interactive]
memory think create <topic> --auto [--non-interactive]
```

**Behaviour**:
1. **With Ollama available**:
   - Display: "Analysing thought..." (spinner)
   - Invoke local LLM (gemma3:1b or configured chat_model)
   - Build prompt with available agents/styles/models from discovery
   - Include "Avoid: X, Y" based on existing thought attributions
   - Parse JSON response: `{ "style": "X", "reasoning": "Y" }`
   - Validate selection against discovery whitelist
   - Display: "Auto-selected (via ollama): --style X. Reasoning: Y. Proceed? (Y/n)"
   - If user confirms (Y): proceed with selection
   - If user rejects (n): abort or allow manual override
   - Timeout: 15s → fallback to heuristics

2. **With Ollama unavailable/timeout**:
   - Skip directly to heuristic keyword matching
   - Display: "Auto-selected (via heuristics - ollama unavailable): --style X. Reasoning: Y. Proceed? (Y/n)"

3. **Circuit Breaker**:
   - Track consecutive Ollama failures in session state
   - After 3 consecutive failures, skip Ollama for remainder of session
   - Reset count on successful Ollama invocation

**Interaction with --non-interactive**:
- If `--non-interactive` flag present: skip confirmation prompt, use recommendation directly
- Otherwise: require user confirmation before proceeding

**Validation Rules**:
- Selected agent must exist in discovery results (whitelist)
- Selected style must exist in discovery results (whitelist)
- Selected model must be one of: haiku, sonnet, opus
- At least one of agent/style/model must be selected

**Error Handling**:
- Ollama unavailable: Fall back to heuristics (not an error)
- Invalid JSON from Ollama: Parse first valid JSON object, fallback to heuristics on failure
- Selection validation fails: Reject selection, use heuristic fallback
- User cancels prompt: Abort command with exit code 0

**Examples**:
```bash
# Basic usage
memory think add "SQL injection in auth module" --auto
# Output: Auto-selected (via ollama): --style Security-Auditor. Reasoning: Security vulnerability detected. Proceed? (Y/n)

# Non-interactive mode
memory think add "Performance optimisation needed" --auto --non-interactive
# Output: Uses auto-selected style without confirmation

# Fallback to heuristics
memory think add "Module design considerations" --auto
# (With Ollama stopped)
# Output: Auto-selected (via heuristics - ollama unavailable): --style Architect. Reasoning: Architectural keywords detected. Proceed? (Y/n)
```

**Default**: Not enabled (manual agent/style/model selection remains default)

**Compatibility**: Works with all `memory think` subcommands (create, add, counter, branch, conclude)

---

### --call <provider>

**Description**: Specify AI provider for thought generation

**Usage**:
```bash
memory think add <content> --call <provider> --model <model> [--oss]
```

**Supported Providers**:
- `claude` (default) - Claude CLI
- `codex` - OpenAI Codex CLI
- `gemini` - Google Gemini CLI

**Behaviour**:

1. **Provider Detection**:
   - Check if provider CLI is installed (`which <command>`)
   - If not found: Error with installation instructions
   - If found: Proceed with invocation

2. **Command Building**:
   - Claude: `claude --print --no-session-persistence --model <model> <prompt>`
   - Codex: `codex exec <prompt> --model <model> [--oss]`
   - Gemini: `gemini <prompt> --model <model> -o text`

3. **Output Parsing**:
   - Claude: Use raw output (already clean with --print)
   - Codex: Strip header lines (version, workdir info)
   - Gemini: Filter extension loading messages

4. **Attribution**:
   - Format: `by: model:<model> provider:<provider> [session-id]`
   - Example: `by: model:gpt-5-codex provider:codex [abc-def-123]`

**Validation Rules**:
- Provider must be one of: claude, codex, gemini
- Model must be specified with --model flag
- --oss flag only valid with codex provider
- --agent flag only supported with claude provider (warn and ignore for others)
- --style flag only supported with claude provider (warn and ignore for others)

**Error Handling**:
- Provider not installed:
  ```
  Codex CLI not installed. Install with: npm i -g @openai/codex
  ```
- Invalid provider:
  ```
  Unknown provider: invalid. Supported providers: claude, codex, gemini
  ```
- --oss with non-codex:
  ```
  Error: The --oss flag is only supported with --call codex
  ```
- --agent with non-claude:
  ```
  Warning: --agent is only supported with --call claude (ignored)
  ```

**Examples**:
```bash
# Codex with cloud model
memory think add "Implementation approach" --call codex --model gpt-5-codex

# Codex with local OSS model
memory think add "Test coverage strategy" --call codex --model gpt:oss-20b --oss

# Gemini
memory think add "Alternative perspective" --call gemini --model gemini-2.5-pro

# Claude (explicit, same as default)
memory think add "Analysis needed" --call claude --model sonnet --agent test-quality-expert
```

**Default**: `claude` (if flag omitted)

**Compatibility**: Works with --model, --agent (claude only), --style (claude only), --oss (codex only)

---

### --oss

**Description**: Use local open-source model with Codex provider

**Usage**:
```bash
memory think add <content> --call codex --model <oss-model> --oss
```

**Behaviour**:
- Only valid when `--call codex` is specified
- Adds `--oss` flag to Codex CLI invocation
- Enables local model execution without API calls
- Model must be in format: `gpt:oss-<size>` (e.g., `gpt:oss-20b`, `gpt:oss-120b`)

**Validation Rules**:
- Must be used with `--call codex` (error if used with claude/gemini)
- Model should follow OSS naming convention (warning if not)

**Error Handling**:
- Used without codex:
  ```
  Error: The --oss flag is only supported with --call codex
  ```

**Examples**:
```bash
# 20B local model
memory think add "Test thought" --call codex --model gpt:oss-20b --oss

# 120B local model
memory think add "Complex analysis" --call codex --model gpt:oss-120b --oss
```

**Default**: Not enabled (cloud models used by default)

**Compatibility**: Only with `--call codex`

---

### --non-interactive

**Description**: Suppress all interactive prompts for pipeline/automation compatibility

**Usage**:
```bash
memory think <subcommand> <content> --non-interactive [other-flags]
```

**Behaviour**:
1. **Hint System**: No interactive prompts for complex thoughts
2. **Auto-Selection**: Use auto-selected recommendation without confirmation
3. **Error Handling**: Return non-zero exit code without prompting for retry
4. **Stdio**: Only write JSON to stdout, errors to stderr

**Affected Features**:
- Interactive prompts for complex thoughts (>200 chars or "?") are suppressed
- Auto-selection confirmation prompt skipped (auto-accept recommendation)
- Any future interactive features must respect this flag

**Use Cases**:
- CI/CD pipelines
- Automated scripts
- Chained commands with pipes
- Cron jobs

**Examples**:
```bash
# Pipeline usage
echo "Should we refactor this module?" | memory think add --non-interactive --auto

# Automation script
for topic in "${topics[@]}"; do
  memory think add "$topic" --call codex --model gpt-5-codex --non-interactive
done

# CI/CD
memory think create "Deployment checklist" --non-interactive --auto
```

**Default**: Interactive mode (prompts enabled)

**Compatibility**: Works with all flags and subcommands

---

## Modified CLI Behaviour

### Help Text Enhancement

**Affected Command**: `memory think --help`

**Change**: Add "Examples" section with concrete usage demonstrations

**New Section Format**:
```
Examples:
  # AI-assisted thought with Claude
  memory think add "Topic" --call claude --style Security-Auditor

  # Auto-select appropriate style/agent
  memory think add "Should we use microservices?" --auto

  # Use alternative provider
  memory think add "Implementation details" --call codex --model gpt-5-codex

  # Non-interactive mode for automation
  memory think create "Design decision" --auto --non-interactive

  # Local OSS model with Codex
  memory think add "Test analysis" --call codex --model gpt:oss-20b --oss
```

**Requirement**: Minimum 3 examples covering:
1. --call with --style or --agent
2. --auto flag
3. --call with alternative provider (codex or gemini)

---

## Flag Compatibility Matrix

| Flag | Compatible With | Incompatible With | Notes |
|------|----------------|-------------------|-------|
| --auto | --non-interactive, --model | --agent, --style, --call | Auto-selection chooses agent/style |
| --call | --model, --oss (codex), --non-interactive | (none) | Provider routing |
| --oss | --call codex, --model | --call claude, --call gemini | Codex-specific |
| --non-interactive | All flags | (none) | Universal suppression |
| --agent | --call claude (default), --style, --model | --call codex, --call gemini, --auto | Claude-specific |
| --style | --call claude (default), --agent, --model | --call codex, --call gemini, --auto | Claude-specific |
| --model | All flags | (none) | Universal model selection |

**Validation Priority**:
1. Check provider compatibility first (--oss with codex only)
2. Warn about ignored flags (--agent with codex/gemini)
3. Validate auto-selection overrides (--auto ignores manual --agent/--style)

---

## Exit Codes

| Code | Meaning | Triggered By |
|------|---------|--------------|
| 0 | Success | Command completed successfully, user cancelled prompt |
| 1 | Error | Invalid flags, provider not found, validation failure |
| 2 | User rejection | User rejected auto-selection and aborted |

**Examples**:
```bash
# Success
memory think add "Test" --auto --non-interactive
echo $?  # 0

# Error - invalid provider
memory think add "Test" --call invalid
echo $?  # 1

# User cancelled
memory think add "Test" --auto
# User presses Ctrl+C at prompt
echo $?  # 0 (graceful cancellation)
```

---

## Backward Compatibility

**Preserved Behaviour**:
- All existing flags work without changes
- Default provider remains `claude`
- No flags required for basic usage
- JSON output format unchanged
- Existing scripts/pipelines continue to work

**New Defaults**:
- Hints shown progressively (first 3 uses, then suppressed)
- Enhanced injection disabled by default (opt-in via config)
- Auto-selection requires explicit `--auto` flag
- Interactive prompts can be disabled with `--non-interactive`

**Migration Path**:
- No changes required for existing usage
- Opt-in to new features via flags or configuration
- Gradual adoption supported

---

**Version**: 1.0.0 | **Created**: 2026-01-24
