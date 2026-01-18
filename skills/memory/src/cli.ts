#!/usr/bin/env bun
/**
 * Memory Skill CLI Entry Point
 *
 * Usage: memory <command> [options]
 *
 * Run `memory help` for available commands.
 */

import { dispatch } from './cli/index.js';

// Run CLI dispatcher with process arguments
const exitCode = await dispatch(process.argv.slice(2));
process.exit(exitCode);
