---
type: learning
title: Define Validation Before Touching Parser Logic
severity: medium
tags: [retrospective, process, code-quality, validation]
created: 2026-01-12T16:00:00Z
updated: 2026-01-12T16:00:00Z
---

# Validation-First Approach for Data Parsing

## Problem

Import operation had custom YAML parser (fragile, error-prone) that didn't validate parsed output. Could silently accept malformed data, cause corruption during write.

## Solution

1. **Define type guards first** (before touching parser):
   ```typescript
   function isValidMemory(value: unknown): value is ExportedMemory { ... }
   function isValidExportPackage(value: unknown): value is ExportPackage { ... }
   ```

2. **Use robust library** (js-yaml) instead of custom parser

3. **Validate before returning**:
   ```typescript
   if (!isValidExportPackage(parsed)) {
     throw new Error('Invalid structure');
   }
   return parsed;
   ```

## Benefits

- **Type safety**: isValid() functions become reusable validators, not one-offs
- **Early failure**: Catches schema violations before write operations
- **Defensive**: Prevents silent corruption of memory data
- **Testable**: Validators can be unit tested independently

## Key: Order of Operations

✅ DO: Define validators → choose parser → apply validators  
❌ DON'T: Write parser → realize validation needed → retrofit it

Results in cleaner, more maintainable code.
