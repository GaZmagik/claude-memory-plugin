---
# Memory Plugin Settings
# =======================
# Copy this file to .claude/memory.local.md and customise.
# Add .claude/*.local.md to your .gitignore
#
# All settings are optional - the plugin works without this file.
# Without Ollama, the plugin still functions (just without semantic search).

enabled: true

# Settings Version (v1.2.0+)
# --------------------------
# Schema version for detecting config updates
settings_version: 1

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

# Ollama Keep-Alive (v1.2.0+)
# ---------------------------
# How long Ollama keeps models loaded in memory (reduces cold-start latency)
# Valid values: "5m", "10m", "30m", "60m"
ollama_keep_alive: 5m

# Ollama Pre-warm Timeout (v1.2.0+)
# ----------------------------------
# Timeout in milliseconds for pre-warming model at session start
# Valid range: 1000-60000 (1-60 seconds)
ollama_prewarm_timeout: 10000

# Advanced Settings (optional)
# ----------------------------
# Uncomment to override defaults:

# health_threshold: 0.7
# semantic_threshold: 0.45
# auto_sync: false

# Reminder Configuration (v1.2.0+)
# --------------------------------
# Show memory/deliberation reminders N times per session (0 to disable)
reminder_count: 1

# Performance Options (v1.2.0+)
# -----------------------------
# Skip heavy hooks (semantic search, health check) after /clear command
skip_hooks_after_clear: false

# Duplicate Detection (LSH)
# -------------------------
# Settings for finding similar/duplicate memories.
# Uses Locality-Sensitive Hashing for large collections.

# duplicate_threshold: 0.92
# lsh_collection_threshold: 200
# lsh_hash_bits: 10
# lsh_tables: 6
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
| `reminder_count` | number | `1` | Show reminders N times per session (0=disable, max=10) |
| `skip_hooks_after_clear` | boolean | `false` | Skip heavy hooks after /clear |
| `ollama_keep_alive` | string | `"5m"` | How long Ollama keeps models loaded (5m/10m/30m/60m) |
| `ollama_prewarm_timeout` | number | `10000` | Pre-warm timeout in ms (1000-60000, default 10s) |

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

**Why skip after clear?** After `/clear`, you may want minimal context injection for a fresh start. Enabling this skips:
- Semantic search based on branch context
- Memory health check warnings
- Active deliberation lists

The basic memory index summary is still shown.

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
