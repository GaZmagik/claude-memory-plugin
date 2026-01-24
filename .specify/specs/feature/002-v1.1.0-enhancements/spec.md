---
user_stories:
  - id: "US1"
    title: "Enhanced Hint Visibility"
    priority: "P1"
    independently_testable: true
  - id: "US2"
    title: "Auto-Selection with --auto Flag"
    priority: "P2"
    independently_testable: true
  - id: "US3"
    title: "Enhanced Memory Injection"
    priority: "P2"
    independently_testable: true
  - id: "US4"
    title: "Cross-Provider Agent Calling"
    priority: "P3"
    independently_testable: true
---

# Feature Specification: v1.1.0 Enhancements

**Feature Branch**: `feature/002-v1.1.0-enhancements`
**Created**: 2026-01-24
**Status**: Draft
**Input**: Exploration document from `.specify/specs/explore/v1.1.0-features.md`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enhanced Hint Visibility (Priority: P1)

As a CLI user running memory think commands, I want to see helpful hints about available AI-assisted features in my terminal output so that I can discover and use the `--call` functionality without reading documentation.

**Why this priority**: Current hint system outputs to JSON stdout, making hints invisible to users. This is the lowest-risk enhancement with highest immediate value for discoverability. Must be implemented first to establish the UX foundation for Feature 2 (--auto).

**Independent Test**: Can be fully tested by invoking `memory think` commands and verifying hints appear in stderr (not JSON stdout), progressively reduce after N uses, and trigger interactive prompts for complex thoughts.

**Acceptance Scenarios**:

1. **Given** I run `memory think create "Topic"` for the first time, **When** the command completes, **Then** a hint appears in stderr (not JSON stdout) suggesting `--call claude` for AI assistance
2. **Given** I've run `memory think` commands 3 times in a session, **When** I run the 4th command, **Then** the hint no longer appears (progressive disclosure threshold reached)
3. **Given** I run `memory think add "Should we migrate to microservices? What are the trade-offs?"`, **When** the command parses the thought (>200 chars or contains "?"), **Then** an interactive prompt asks: "This thought seems complex. Invoke AI for assistance? (y/N)"
4. **Given** I run `memory think add "Topic" --non-interactive`, **When** the command executes, **Then** no interactive prompts appear (pipeline composability preserved)
5. **Given** I run `memory think --help`, **When** help text is displayed, **Then** at least 3 concrete examples of `--call`, `--style`, and `--agent` usage are shown
6. **Given** hint tracking state exists from a previous session, **When** I start a new session, **Then** hint counts reset (per-session tracking)

---

### User Story 2 - Auto-Selection with --auto Flag (Priority: P2)

As a CLI user deliberating on complex topics, I want the system to intelligently recommend appropriate agents/styles/models using local AI so that I don't have to manually remember and select from 15+ output styles and multiple agents.

**Why this priority**: Most complex feature requiring security hardening and AI integration. Depends on US1 for confirmation prompts. Higher value than US3 because it directly enhances the deliberation workflow.

**Independent Test**: Can be tested by running `memory think add "Topic" --auto` and verifying Ollama is invoked (if available), appropriate selections are recommended with reasoning, and user confirmation is required before proceeding.

**Acceptance Scenarios**:

1. **Given** Ollama is available with gemma3:1b, **When** I run `memory think add "SQL injection vulnerability in auth" --auto`, **Then** the system displays "Analysing thought..." and returns a recommendation like "Auto-selected (via ollama): --style Security-Auditor. Reasoning: Topic involves security vulnerability. Proceed? (Y/n)"
2. **Given** Ollama is unavailable or times out (>15s), **When** I run `memory think add "Should we use microservices?" --auto`, **Then** the system falls back to heuristics and displays "Auto-selected (via heuristics - ollama unavailable): --style Devils-Advocate. Reasoning: Question pattern detected. Proceed? (Y/n)"
3. **Given** a deliberation already has thoughts from Pragmatist and Architect, **When** I run `memory think add "Additional perspective" --auto` on the same deliberation, **Then** the system recommends a different appropriate style (e.g., Devils-Advocate) avoiding already-used styles for diversity
4. **Given** I approve an auto-selection, **When** the AI is invoked, **Then** the thought attribution includes the selected agent/style/model
5. **Given** I reject an auto-selection, **When** prompted, **Then** the system allows manual selection or abort
6. **Given** I run `memory think add "Topic" --auto --non-interactive`, **When** the command executes, **Then** the auto-selected recommendation is used directly without confirmation prompt
7. **Given** auto-selection recommends an agent that doesn't exist, **When** selection is validated, **Then** the system rejects the invalid selection and falls back to heuristics
8. **Given** Ollama has failed 3 consecutive times in a session, **When** I run `--auto` again, **Then** the system skips Ollama and uses heuristics immediately (circuit breaker)

**Heuristic Fallback Rules** (when Ollama unavailable):
- Keywords: "security", "vulnerability", "auth" → style: Security-Auditor
- Keywords: "architecture", "design", "structure" → style: Architect
- Keywords: "should we", "trade-off", "pros cons" → style: Devils-Advocate
- Keywords: "performance", "optimise", "speed" → style: Pragmatist
- Keywords: "test", "coverage", "spec" → agent: test-quality-expert
- Default (no keyword match): style: Architect, model: haiku

---

### User Story 3 - Enhanced Memory Injection (Priority: P2)

As a developer reading/editing files with relevant historical context, I want the PostToolUse hook to surface not just gotchas but also relevant decisions and learnings so that I can benefit from past project knowledge without searching manually.

**Why this priority**: Extends existing pattern (gotcha-injector) with moderate complexity. Lower priority than US2 because it's a passive enhancement rather than active workflow improvement. Can be implemented in parallel with US2.

**Independent Test**: Can be tested by creating decisions/learnings tagged for specific files, enabling injection in config, then reading those files and verifying appropriate memories are surfaced with type-specific formatting.

**Acceptance Scenarios**:

1. **Given** memory injection is configured with default settings (gotchas only), **When** I read a file, **Then** only gotcha-type memories are injected (backward compatibility preserved)
2. **Given** memory.local.md enables decisions injection (`injection.types.decision.enabled: true`), **When** I read a file with related decisions, **Then** decisions are surfaced with 📋 icon and relevance score >0.35
3. **Given** memory.local.md enables learnings injection (`injection.types.learning.enabled: true`), **When** I read a file with related learnings, **Then** learnings are surfaced with 💡 icon and relevance score >0.4
4. **Given** multiple memory types are enabled, **When** memories are injected, **Then** they are prioritised by type (gotchas > decisions > learnings) then relevance score
5. **Given** 10 relevant memories exist across all types, **When** injection occurs, **Then** only the top N per type are shown (gotchas: 5, decisions: 3, learnings: 2) with total limit of 10
6. **Given** I'm using a Bash tool, **When** memories are injected, **Then** threshold multiplier of 1.2x is applied (stricter relevance requirement)
7. **Given** I'm using Edit/Write tools, **When** memories are injected, **Then** threshold multiplier of 0.8x is applied (looser relevance requirement)
8. **Given** a memory was already injected this session, **When** I read another file, **Then** that memory is not injected again (session deduplication by memory ID and type)
9. **Given** memory injection is enabled, **When** PostToolUse hook executes, **Then** single semantic search call is made with client-side filtering by type (performance optimisation)

**Configuration Example** (memory.local.md):
```yaml
injection:
  enabled: true
  types:
    gotcha:
      enabled: true
      threshold: 0.2
      limit: 5
    decision:
      enabled: false  # opt-in
      threshold: 0.35
      limit: 3
    learning:
      enabled: false  # opt-in
      threshold: 0.4
      limit: 2
  hook_multipliers:
    Read: 1.0
    Edit: 0.8
    Write: 0.8
    Bash: 1.2
```

---

### User Story 4 - Cross-Provider Agent Calling (Priority: P3)

As a CLI user who may prefer different AI providers for different tasks, I want to invoke Codex or Gemini agents using `--call codex` or `--call gemini` so that I can access alternative perspectives and local OSS models without being locked into Claude only.

**Why this priority**: Proves provider agnosticism and enables OSS local model usage (Codex --oss flag), but is lower priority because core functionality works with Claude alone. Moderate complexity with external CLI dependencies.

**Independent Test**: Can be tested by installing Codex/Gemini CLIs, running `memory think add "Topic" --call codex --model gpt-5-codex`, and verifying the correct CLI is invoked and output is properly attributed.

**Acceptance Scenarios**:

1. **Given** Codex CLI is installed, **When** I run `memory think add "Topic" --call codex --model gpt-5-codex`, **Then** the system invokes `codex exec "prompt" --model gpt-5-codex`, parses the output, and attributes the thought to "by: model:gpt-5-codex provider:codex [session-id]"
2. **Given** Codex CLI is installed, **When** I run `memory think add "Topic" --call codex --model gpt:oss-20b --oss`, **Then** the system invokes Codex with the --oss flag for local model usage
3. **Given** Gemini CLI is installed, **When** I run `memory think add "Topic" --call gemini --model gemini-2.5-pro`, **Then** the system invokes `gemini "prompt" --model gemini-2.5-pro -o text`, filters extension loading noise, and returns clean output
4. **Given** Codex CLI is not installed, **When** I run `memory think add "Topic" --call codex`, **Then** a graceful error is displayed: "Codex CLI not installed. Install with: npm i -g @openai/codex"
5. **Given** I run `memory think add "Topic" --call codex --agent memory-expert`, **When** the command parses parameters, **Then** a warning is displayed: "Warning: --agent is only supported with --call claude (ignored)" and the command proceeds without --agent
6. **Given** I run `memory think add "Topic" --call gemini --oss`, **When** the command validates parameters, **Then** an error is displayed: "The --oss flag is only supported with --call codex"
7. **Given** only --model parameter is portable, **When** I use --call with codex or gemini, **Then** provider-specific parameters (--profile for Codex, --extensions for Gemini) are NOT supported in v1.1.0

**Provider CLI Command Structures**:
- Claude: `claude --print "prompt" --model sonnet`
- Codex: `codex exec "prompt" --model gpt-5-codex` or `codex exec "prompt" --model gpt:oss-20b --oss`
- Gemini: `gemini "prompt" --model gemini-2.5-pro -o text`

---

### Edge Cases

- What happens when hint tracking state file is corrupted? → Rebuild from scratch, default to showing hints (fail-open for discoverability)
- What happens when Ollama returns malformed JSON for --auto selection? → Parse first valid JSON object; if parsing fails, fall back to heuristics
- What happens when auto-selected agent path doesn't exist on disk? → Validate against discovery results; reject invalid selections and use heuristics
- What happens when memory.local.md has invalid injection config? → Use sensible defaults (gotchas only) and log warning
- What happens when semantic search times out during injection? → Fall back to tag/path-based matching for that invocation
- What happens when Codex CLI hangs indefinitely? → [NEEDS CLARIFICATION: Should we implement timeout for provider CLI invocations? Suggested: 30s timeout]
- What happens when multiple provider CLIs are installed but one fails? → Fail gracefully for that provider only; other providers remain usable
- What happens when --auto is used in a deliberation with no existing thoughts? → No avoid list; recommend best-fit style/agent based on topic alone
- What happens when user rejects auto-selection repeatedly? → Allow manual override or abort; no automatic retry

## Requirements *(mandatory)*

### Functional Requirements

**Enhanced Hint Visibility (US1)**:
- **FR-001**: System MUST output hints to stderr (not JSON stdout) to separate informational messages from data
- **FR-002**: System MUST track hint display count per hint type using session state stored in `.claude/session-state/<sessionId>/hints.json`
- **FR-003**: System MUST implement progressive disclosure: show hints first N uses (default: 3), then suppress
- **FR-004**: System MUST provide configurable threshold for progressive disclosure via session state
- **FR-005**: System MUST trigger interactive confirmation prompt when thought content is complex (>200 chars OR contains "?")
- **FR-006**: System MUST respect --non-interactive flag: skip all prompts if set
- **FR-007**: System MUST enhance --help output with at least 3 concrete examples of --call, --style, --agent usage
- **FR-008**: System MUST reset hint counts per session (not persist across sessions)

**Auto-Selection with --auto Flag (US2)**:
- **FR-009**: System MUST implement tiered selection strategy: Tier 1 (Ollama if available), Tier 2 (heuristics)
- **FR-010**: System MUST invoke Ollama with 15s timeout to accommodate typical hardware performance
- **FR-011**: System MUST display "Analysing thought..." spinner during Ollama invocation
- **FR-012**: System MUST build Ollama prompt with full lists of available agents, styles, and models from discovery
- **FR-013**: System MUST include "Avoid: X, Y (already used)" in Ollama prompt based on existing thought attributions for diversity
- **FR-014**: System MUST validate Ollama response against discovery results (whitelist validation)
- **FR-015**: System MUST fall back to heuristics if Ollama unavailable, times out, or returns unparseable response
- **FR-016**: System MUST display recommendation with source indicator: "(via ollama)" or "(via heuristics - ollama unavailable)"
- **FR-017**: System MUST prompt user for confirmation before proceeding with auto-selection: "Proceed? (Y/n)"
- **FR-018**: System MUST allow user to approve, reject, or modify selection
- **FR-019**: System MUST implement circuit breaker: after 3 consecutive Ollama failures, skip to heuristics for remainder of session
- **FR-020**: System MUST sanitise thought content before inclusion in Ollama prompt (escape special characters)
- **FR-021**: System MUST use gemma3:1b as default model for --auto (or user-configured chat model from memory.local.md)
- **FR-022**: System MUST implement heuristic keyword matching with rules as specified in US2 acceptance scenarios

**Enhanced Memory Injection (US3)**:
- **FR-023**: System MUST extend PostToolUse hook to inject decisions and learnings in addition to gotchas
- **FR-024**: System MUST make injection configurable via memory.local.md with per-type settings (enabled, threshold, limit)
- **FR-025**: System MUST use conservative defaults: gotchas enabled (threshold: 0.2, limit: 5), decisions/learnings disabled
- **FR-026**: System MUST perform single semantic search call per hook invocation with client-side filtering by type
- **FR-027**: System MUST apply per-type relevance thresholds: gotchas (0.2), decisions (0.35), learnings (0.4)
- **FR-028**: System MUST apply hook-type multipliers to thresholds: Read (1.0x), Edit/Write (0.8x), Bash (1.2x)
- **FR-029**: System MUST prioritise injected memories by type (gotcha > decision > learning) then relevance score
- **FR-030**: System MUST respect per-type limits and hard total limit of 10 memories
- **FR-031**: System MUST format output with type-specific icons: 🚨 Gotchas, 📋 Decisions, 💡 Learnings
- **FR-032**: System MUST deduplicate injections within session using cache keyed by (memoryId, type)
- **FR-033**: System MUST preserve backward compatibility: default configuration matches current behaviour (gotchas only)
- **FR-034**: System MUST document injection configuration in .claude/memory.example.md with opt-in instructions

**Cross-Provider Agent Calling (US4)**:
- **FR-035**: System MUST support --call parameter with values: claude, codex, gemini
- **FR-036**: System MUST implement provider detection: check CLI installation with `which <provider-command>`
- **FR-037**: System MUST build provider-specific command syntax per Provider CLI Command Structures (see US4)
- **FR-038**: System MUST parse provider-specific output: Claude (use as-is), Codex (strip headers), Gemini (filter extension noise)
- **FR-039**: System MUST support --oss flag exclusively for Codex (local OSS models)
- **FR-040**: System MUST support --model as the only portable parameter across all providers
- **FR-041**: System MUST provide graceful error with installation instructions if provider CLI not found
- **FR-042**: System MUST warn and ignore --agent/--style when used with non-Claude providers
- **FR-043**: System MUST attribute thoughts with provider information: "by: model:X provider:Y [session-id]"
- **FR-044**: System MUST validate --oss flag: error if used with non-Codex providers

### Non-Functional Requirements

**Performance**:
- **NFR-001**: Hint display MUST add <10ms latency to CLI response time
- **NFR-002**: Auto-selection with Ollama (gemma3:1b) SHOULD complete in <1s on typical hardware
- **NFR-003**: Auto-selection with heuristics fallback MUST complete in <100ms
- **NFR-004**: Enhanced memory injection MUST add <100ms latency to PostToolUse hook (single search, client-side filtering)
- **NFR-005**: Session state operations (hint tracking) MUST complete in <50ms

**Security**:
- **NFR-006**: Ollama prompt injection MUST be mitigated via input sanitisation (escape special characters)
- **NFR-007**: Auto-selection validation MUST whitelist against discovery results (prevent malicious agent injection)
- **NFR-008**: Ollama invocation MUST enforce 15s timeout (prevent DoS via latency)
- **NFR-009**: Circuit breaker MUST protect against repeated Ollama failures (3 consecutive failures → skip for session)
- **NFR-010**: Provider CLI invocation MUST NOT expose sensitive data in command arguments [NEEDS CLARIFICATION: Should we implement stdout/stderr sanitisation?]

**Usability**:
- **NFR-011**: All error messages MUST be actionable (provide installation instructions, configuration guidance)
- **NFR-012**: Progressive disclosure MUST reduce hint noise while maintaining discoverability
- **NFR-013**: Auto-selection recommendations MUST include reasoning for transparency
- **NFR-014**: Interactive prompts MUST support --non-interactive flag for pipeline composability
- **NFR-015**: Provider-specific limitations MUST be clearly documented in help text and errors

**Maintainability**:
- **NFR-016**: Enhanced injection MUST extend existing gotcha-injector.ts pattern (no architectural redesign)
- **NFR-017**: Auto-selection MUST integrate with existing discovery.ts and ollama.ts services (no new abstraction layers)
- **NFR-018**: Provider calling MUST use direct CLI invocation (no wrapper abstractions per constitution P5)
- **NFR-019**: All features MUST follow library-first design principle (prompts package, existing ollama-js)

**Compatibility**:
- **NFR-020**: All features MUST maintain backward compatibility with existing memory plugin functionality
- **NFR-021**: Default configurations MUST preserve current behaviour (opt-in for new features)
- **NFR-022**: Pipeline mode MUST work correctly with --non-interactive flag

### Key Entities

- **HintState**: Session-scoped tracking of hint display counts per hint type (stored in `.claude/session-state/<sessionId>/hints.json`)
- **AutoSelection**: AI-recommended agent/style/model with reasoning and source indicator (ollama vs heuristics)
- **InjectionConfig**: User configuration for memory type injection (enabled, threshold, limit per type)
- **ProviderConfig**: CLI command structure and output parser for each AI provider (claude, codex, gemini)
- **MemoryInjectionResult**: Filtered and prioritised memories by type with relevance scores
- **CircuitBreakerState**: Session-scoped tracking of consecutive Ollama failures for auto-selection

## Success Criteria *(mandatory)*

### Measurable Outcomes

**Enhanced Hint Visibility**:
- **SC-001**: Hints appear in stderr (not JSON stdout) and are visible in terminal output
- **SC-002**: Hint display count tracked correctly: first 3 invocations show hint, 4th and subsequent do not
- **SC-003**: Interactive prompts trigger for thoughts >200 chars or containing "?" with user confirmation required
- **SC-004**: --non-interactive flag suppresses all prompts whilst preserving functionality
- **SC-005**: Help text includes 3+ examples demonstrating --call, --style, --agent usage

**Auto-Selection**:
- **SC-006**: Ollama-based selection completes in <1s for gemma3:1b on typical hardware
- **SC-007**: Heuristic fallback completes in <100ms when Ollama unavailable
- **SC-008**: Repeated --auto calls on same deliberation recommend 3 different appropriate styles (diversity via avoid list)
- **SC-009**: Selection validation catches 100% of invalid agent/style names (whitelist against discovery)
- **SC-010**: Circuit breaker activates after 3 consecutive Ollama failures, skipping Ollama for remainder of session
- **SC-011**: User confirmation required before auto-selected agent is invoked (security gate)

**Enhanced Memory Injection**:
- **SC-012**: Default configuration preserves existing behaviour (gotchas only, backward compatible)
- **SC-013**: Opt-in configuration successfully injects decisions and learnings with type-specific icons
- **SC-014**: Single semantic search call per hook invocation (not 3 separate searches per type)
- **SC-015**: Threshold multipliers correctly applied: Bash commands have 1.2x stricter threshold
- **SC-016**: Session deduplication prevents same memory from appearing twice in one session
- **SC-017**: Total injected memories capped at 10 regardless of configuration (prevent overwhelming output)

**Cross-Provider Calling**:
- **SC-018**: `--call codex --model gpt-5-codex` successfully invokes Codex CLI and returns attributed thought
- **SC-019**: `--call codex --model gpt:oss-20b --oss` successfully uses local Codex OSS models
- **SC-020**: `--call gemini --model gemini-2.5-pro` successfully invokes Gemini CLI with clean output parsing
- **SC-021**: Missing provider CLI displays graceful error with installation instructions (not stack trace)
- **SC-022**: Provider-specific parameters (--agent with codex) display warning and are ignored gracefully
- **SC-023**: Attribution correctly identifies provider and model: "by: model:X provider:Y [session-id]"

## Assumptions

1. **Ollama is available locally for --auto feature** - Graceful degradation to heuristics if not; no hard dependency
2. **Users have memory.local.md for configuration** - Sensible defaults provided if config missing
3. **Session state mechanisms can track hint counts and circuit breaker state** - Extend existing `.claude/session-state/` pattern
4. **Provider CLIs follow documented command structures** - Based on --help output exploration; may need adjustment for CLI updates
5. **Gemma3:1b model is adequate for auto-selection task** - Benchmarked at ~0.6s with proper prompt engineering
6. **Users understand AI-assisted deliberation workflow** - Familiarity with --call, --style, --agent from existing documentation
7. **Pipeline users will adopt --non-interactive flag** - Clear documentation needed for pipeline composability
8. **Enterprise/team users will opt-in to enhanced injection** - Conservative defaults protect against noise; opt-in for advanced users

## Out of Scope

The following are explicitly **not** included in v1.1.0:

- **--style via prompt injection for non-Claude providers** - Deferred to v1.2.0 (quality varies across providers)
- **Provider-specific parameters** - --profile (Codex), --extensions (Gemini), --agent (Claude-only) deferred to v1.2.0
- **Gemma local model support for --call** - Pending tool-call capability; deferred to future version
- **Custom heuristic rules via configuration** - Hard-coded rules sufficient for v1.1.0; extensibility deferred
- **Multi-model ensemble for --auto** - Single model (gemma3:1b) sufficient; ensemble complexity not justified
- **Persistent hint state across sessions** - Per-session tracking only; cross-session persistence adds complexity without clear benefit
- **Advanced injection strategies** - Lazy loading, tiered relevance, ML-based ranking deferred; single search with client-side filtering sufficient
- **Provider CLI version detection** - Assumes latest CLI versions; compatibility matrix deferred
- **Metrics/telemetry for feature usage** - No tracking of --auto adoption, hint effectiveness, etc.; deferred to future analytics work

## Dependencies

### Required

| Dependency | Purpose | Provided By |
|------------|---------|-------------|
| TypeScript with Bun runtime | Execution environment | Existing project stack |
| prompts (npm) | Interactive CLI prompts | **NEW** - well-established, 1M+ weekly downloads |
| Existing session-state mechanism | Hint tracking and circuit breaker state | Extend `.claude/session-state/` pattern |
| Existing discovery.ts | Agent/style enumeration for --auto | skills/memory/src/think/discovery.ts |
| Existing ollama.ts service | Ollama integration for --auto | hooks/src/services/ollama.ts |

### Optional

| Dependency | Purpose | Fallback |
|------------|---------|----------|
| Ollama with gemma3:1b | AI-powered auto-selection | Heuristic keyword matching |
| Codex CLI | Cross-provider calling (codex) | Graceful error with install instructions |
| Gemini CLI | Cross-provider calling (gemini) | Graceful error with install instructions |
| memory.local.md configuration | Enhanced injection opt-in | Conservative defaults (gotchas only) |

## Open Questions

1. **Should provider CLI invocations have timeout enforcement?** - Suggested: 30s timeout to prevent indefinite hangs; affects FR-035 implementation
2. **Should stdout/stderr from provider CLIs be sanitised?** - Security consideration for NFR-010; may contain sensitive debug information
3. **Should circuit breaker state persist across sessions?** - Current spec: session-only; persistent state could improve UX but adds complexity
4. **Should heuristic rules be configurable via memory.local.md?** - Deferred to future; hard-coded rules sufficient for v1.1.0 but extensibility may be valuable
5. **Should --auto support custom Ollama models via config?** - Current spec: use chat model from memory.local.md; may need explicit --auto-model override
6. **Should enhanced injection support custom type priorities?** - Current spec: hard-coded priority (gotcha > decision > learning); configurable priority deferred

## Implementation Phases

Based on constitution P2 (Test-First Development) and complexity assessment from exploration:

**Phase 1: Enhanced Hint Visibility (US1)** - Lowest risk, highest immediate value
- Implement stderr output in response.ts
- Add hint-tracker.ts with session state
- Add interactive prompts with --non-interactive flag
- Update help text with examples
- **Estimated effort**: 1-2 days

**Phase 2: Enhanced Memory Injection (US3)** - Builds on existing patterns
- Extend injection configuration in memory.local.md
- Implement enhanced-injector.ts with multi-type support
- Update PostToolUse hook with new injector
- Document opt-in configuration
- **Estimated effort**: 2-3 days

**Phase 3: Auto-Selection with --auto Flag (US2)** - Most complex, needs security hardening
- Implement auto-selector.ts with Ollama integration
- Add selection prompt and confirmation flow
- Implement security safeguards (validation, timeouts, sanitisation)
- Integration testing with discovery system
- **Estimated effort**: 3-4 days

**Phase 4: Cross-Provider Calling (US4)** - Moderate complexity, external dependencies
- Implement providers.ts with provider configs and output parsers
- Modify ai-invoke.ts to route to different CLIs
- Add --oss flag support for Codex local models
- Error handling for missing CLIs
- Integration testing with mocked/real provider CLIs
- **Estimated effort**: 2-3 days

**Total estimated effort**: 8-12 days
