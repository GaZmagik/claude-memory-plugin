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
