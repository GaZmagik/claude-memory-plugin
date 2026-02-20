---
type: learning
title: Integration tests revealed critical basePath setup pattern
tags: feature-005, testing, integration, basePath, test-pattern
---

Integration tests initially failed because they used memoryDir instead of tempDir as basePath. Memory functions expect the project root (tempDir) and append .claude/memory internally. Following existing test patterns (external-file-integration.spec.ts) was critical for success.
