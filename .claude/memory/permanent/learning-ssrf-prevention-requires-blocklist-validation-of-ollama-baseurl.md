---
id: learning-ssrf-prevention-requires-blocklist-validation-of-ollama-baseurl
title: SSRF prevention requires blocklist validation of Ollama baseUrl
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-21T12:52:32.563Z"
updated: "2026-02-21T12:52:43.979Z"
tags:
  - security
  - ssrf
  - url-validation
  - project
---

Ollama provider URLs must be validated against cloud metadata endpoints (AWS, GCP, Azure) and localhost IPs. validateOllamaUrl() checks protocol and blocks metadata services. 15 validation tests confirm coverage.
