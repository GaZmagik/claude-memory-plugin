---
# Memory Plugin Settings
# =======================
# Copy this file to .claude/memory.local.md and customise.
# Add .claude/*.local.md to your .gitignore
#
# All settings are optional - the plugin works without this file.
# Without Ollama, the plugin still functions (just without semantic search).

enabled: true

# Ollama Configuration
# --------------------
# The plugin uses Ollama for semantic search and AI-assisted features.
# If Ollama is not available, the plugin degrades gracefully.
# The following settings have been tested and work well with the following specs:
# - CPU: Intel Core i7 4th Gen
# - RAM: 32GB (16GB will very likely be sufficient)
# - GPU: NVIDIA GTX 1060 6GB
# With gemma3:4b at 32k context, both models load onto GPU successfully)
# Even without the GPU, performance has been tested on the above CPU/RAM specs and is acceptable.

ollama_host: http://localhost:11434
chat_model: gemma3:4b
embedding_model: embeddinggemma:latest
context_window: 16384

# Advanced Settings (optional)
# ----------------------------
# Uncomment to override defaults:

# health_threshold: 0.7
# semantic_threshold: 0.45
# auto_sync: false

# Settings Version (v1.2.0+)
# --------------------------
# Schema version for detecting config updates.
# Bump this when new settings are added to trigger migration prompts.

settings_version: 1

# Duplicate Detection (LSH)
# -------------------------
# Settings for finding similar/duplicate memories.
# Uses Locality-Sensitive Hashing for large collections.

# duplicate_threshold: 0.92
# lsh_collection_threshold: 200
# lsh_hash_bits: 10
# lsh_tables: 6

# Memory Injection (v1.1.0+)
# --------------------------
# Configure which memory types are injected into agent context.
# By default, only gotchas are injected. Enable decisions/learnings for richer context.

# injection:
#   enabled: true
#   types:
#     gotcha:
#       enabled: true
#       threshold: 0.2
#       limit: 5
#     decision:
#       enabled: false      # Set to true to inject decisions
#       threshold: 0.35
#       limit: 3
#     learning:
#       enabled: false      # Set to true to inject learnings
#       threshold: 0.4
#       limit: 2
#   hook_multipliers:
#     Read: 1.0
#     Edit: 0.8             # Lower threshold for edits (more relevant)
#     Write: 0.8            # Lower threshold for writes
#     Bash: 1.2             # Higher threshold for bash (less noise)
---

# Memory Plugin Configuration

This file customises the memory plugin behaviour for this project.
Settings are merged with plugin defaults - you only need to specify
values you want to override.

## Quick Start

1. Copy this file to `.claude/memory.local.md`
2. Update `ollama_host` if using a remote Ollama server
3. Change `chat_model` to your preferred model

## Settings Reference

### Core Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabled` | boolean | `true` | Master switch to enable/disable the plugin |
| `ollama_host` | string | `http://localhost:11434` | Ollama API endpoint |
| `chat_model` | string | `gemma3:4b` | Model for summaries and chat |
| `embedding_model` | string | `embeddinggemma:latest` | Model for semantic search |
| `context_window` | number | `16384` | Max tokens for context |

### Advanced Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `health_threshold` | number | `0.7` | Graph health warning threshold (0-1) |
| `semantic_threshold` | number | `0.45` | Semantic search similarity cutoff (0-1) |
| `auto_sync` | boolean | `false` | Run memory sync on session start |

### v1.2.0 Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `settings_version` | number | `1` | Schema version for detecting config updates |
| `reminder_count` | number | `1` | Show reminders N times per session (0=disable) |
| `skip_hooks_after_clear` | boolean | `false` | Skip heavy hooks after /clear |
| `ollama_keep_alive` | string | `"5m"` | How long Ollama keeps models loaded |

#### Reminder Configuration

Control how often memory reminders are shown:

```yaml
reminder_count: 1    # Show once per session (default)
reminder_count: 3    # Show first 3 prompts
reminder_count: 0    # Disable reminders
```

#### Performance Options

```yaml
skip_hooks_after_clear: false  # (default) Show full memory index after /clear
skip_hooks_after_clear: true   # Skip semantic search/health checks after /clear
```

**Why skip after clear?** After `/clear`, you may want minimal context injection
for a fresh start. Enabling this skips:
- Semantic search based on branch context
- Memory health check warnings
- Active deliberation lists

The basic memory index summary is still shown.

#### Ollama Keep-Alive

Configure how long Ollama keeps models loaded in memory:

```yaml
ollama_keep_alive: 5m   # 5 minutes (default)
ollama_keep_alive: 10m  # 10 minutes
ollama_keep_alive: 30m  # 30 minutes
ollama_keep_alive: 60m  # 1 hour
```

Longer durations reduce cold-start latency but consume more RAM.

#### Ollama Pre-warm Timeout

Configure the timeout for pre-warming the Ollama model at session start:

```yaml
ollama_prewarm_timeout: 10000  # 10 seconds (default)
ollama_prewarm_timeout: 15000  # 15 seconds
ollama_prewarm_timeout: 30000  # 30 seconds
```

Pre-warming loads the model at session start to reduce latency for first memory operations.
Users with slower systems or larger models may benefit from a longer timeout.

### Duplicate Detection (LSH)

Settings for the `suggest-links` and duplicate detection features.
Uses Locality-Sensitive Hashing for efficient similarity search on large collections.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `duplicate_threshold` | number | `0.92` | Similarity threshold for duplicate detection (0-1) |
| `lsh_collection_threshold` | number | `200` | Collection size to switch from brute force to LSH |
| `lsh_hash_bits` | number | `10` | Hash bits per LSH table (more = faster, may miss duplicates) |
| `lsh_tables` | number | `6` | Number of LSH hash tables (more = better recall, more memory) |

## Model Selection

You can use any Ollama-compatible model. Popular choices:

- `gemma3:4b` - Fast, good quality (default)
- `gemma3:12b` - Higher quality, slower
- `llama3.2` - Meta's Llama model
- `mistral:7b` - Mistral AI model
- `gpt-oss:20b` - Larger open-source model
- `qwen2.5:7b` - Alibaba's Qwen model

For embedding models:
- `embeddinggemma:latest` - Google's embedding model (default)
- `nomic-embed-text` - Nomic AI's embedding model
- `mxbai-embed-large` - MixedBread AI embedding

## Remote Ollama

To use a remote Ollama server:

```yaml
ollama_host: http://192.168.1.100:11434
```

Or with authentication proxy:

```yaml
ollama_host: https://ollama.example.com
```

## Without Ollama

The plugin works without Ollama installed. Features that require Ollama
(semantic search, AI summaries) will be disabled, but core functionality
(memory storage, graph management, keyword search) remains available.

## Troubleshooting

**Plugin not reading settings?**
- Ensure file is at `.claude/memory.local.md` (not project root)
- Check YAML syntax is valid (no tabs, proper indentation)
- Restart Claude Code after changes

**Ollama connection errors?**
- Verify Ollama is running: `curl http://localhost:11434/api/tags`
- Check `ollama_host` matches your Ollama server
- Ensure model is pulled: `ollama pull gemma3:4b`

**Poor semantic search results?**
- Try adjusting `semantic_threshold` (lower = more results)
- Ensure `embedding_model` is installed and working

## Memory Injection (v1.1.0+)

Control which memory types are injected into agent context during file operations.

### Default Behaviour

By default, only **gotchas** are injected. This maintains backward compatibility
and keeps context focused on warnings/pitfalls.

### Enabling Decisions and Learnings

To inject decisions and learnings alongside gotchas, add to your `memory.local.md`:

```yaml
injection:
  enabled: true
  types:
    gotcha:
      enabled: true
      threshold: 0.2
      limit: 5
    decision:
      enabled: true       # Enable decision injection
      threshold: 0.35
      limit: 3
    learning:
      enabled: true       # Enable learning injection
      threshold: 0.4
      limit: 2
```

### Settings Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `injection.enabled` | boolean | `true` | Master switch for memory injection |
| `injection.types.<type>.enabled` | boolean | varies | Enable injection for this memory type |
| `injection.types.<type>.threshold` | number | varies | Minimum similarity score (0-1) to inject |
| `injection.types.<type>.limit` | number | varies | Maximum memories of this type to inject |

### Hook Multipliers

Adjust thresholds based on the tool being used:

| Hook | Default | Effect |
|------|---------|--------|
| `Read` | 1.0 | Standard threshold |
| `Edit` | 0.8 | Lower threshold (20% more sensitive) |
| `Write` | 0.8 | Lower threshold (20% more sensitive) |
| `Bash` | 1.2 | Higher threshold (20% less sensitive) |

Example: With `decision.threshold: 0.35` and `Edit` multiplier `0.8`:
- Effective threshold = 0.35 × 0.8 = 0.28

### Type Priority

When multiple memory types match, they're shown in priority order:
1. 🚨 **Gotchas** - Warnings and pitfalls (highest priority)
2. 📋 **Decisions** - Architectural choices and rationale
3. 💡 **Learnings** - Insights and patterns

Total injection is capped at 10 memories per tool use.
