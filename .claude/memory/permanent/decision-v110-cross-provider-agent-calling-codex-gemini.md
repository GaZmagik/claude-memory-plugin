---
id: decision-v110-cross-provider-agent-calling-codex-gemini
title: v1.1.0 Cross-Provider Agent Calling (Codex & Gemini)
type: decision
scope: project
created: "2026-01-24T20:40:26.858Z"
updated: "2026-01-24T20:40:26.858Z"
tags:
  - promoted-from-think
  - project
---

# v1.1.0 Cross-Provider Agent Calling (Codex & Gemini)

v1.1.0 will add basic cross-provider support: --call codex and --call gemini with --model as the only portable parameter. Codex also supports --oss flag for local models (gpt:oss-20b/120b). CLIs must be installed or command fails gracefully. Full feature set (--style via prompt injection, provider-specific params like --profile/--extensions/--agent) deferred to v1.2.0. This keeps v1.1.0 scope manageable while proving the multi-provider concept.

_Deliberation: `thought-20260124-201644386`_
