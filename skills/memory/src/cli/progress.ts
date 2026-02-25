/**
 * Progress Reporting Utility
 *
 * Provides live progress feedback for long-running CLI operations.
 * Writes to stderr so it doesn't corrupt JSON stdout output.
 *
 * Supports:
 * - Step-based progress (e.g., "Generating embeddings [3/42]")
 * - Phase-based progress (e.g., "Phase 2/5: Removing ghost nodes")
 * - Elapsed time display
 * - TTY-aware: uses carriage return for in-place updates on TTY,
 *   falls back to newlines for piped output
 */

/**
 * Progress callback type for functions that report item-level progress
 */
export type ProgressCallback = (current: number, total: number, label?: string) => void;

/**
 * Configuration for creating a ProgressReporter
 */
export interface ProgressReporterOptions {
  /** High-level operation name (e.g., "Generating embeddings") */
  operation: string;
  /** Total number of items to process (0 if unknown) */
  total?: number;
  /** Whether to show elapsed time (default: true) */
  showElapsed?: boolean;
  /** Minimum interval between updates in ms (default: 100) */
  throttleMs?: number;
  /** Custom output function (default: process.stderr.write) */
  output?: (text: string) => void;
}

/**
 * Formats elapsed time as human-readable string
 */
function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m${remainingSeconds}s`;
}

/**
 * Progress reporter for long-running CLI operations.
 *
 * Writes progress updates to stderr to keep stdout clean for JSON output.
 * Automatically detects TTY mode for in-place updates vs newline output.
 */
export class ProgressReporter {
  private operation: string;
  private total: number;
  private current: number = 0;
  private startTime: number;
  private lastUpdateTime: number = 0;
  private throttleMs: number;
  private showElapsed: boolean;
  private output: (text: string) => void;
  private isTTY: boolean;
  private finished: boolean = false;

  constructor(options: ProgressReporterOptions) {
    this.operation = options.operation;
    this.total = options.total ?? 0;
    this.showElapsed = options.showElapsed ?? true;
    this.throttleMs = options.throttleMs ?? 100;
    this.output = options.output ?? ((text: string) => process.stderr.write(text));
    this.isTTY = process.stderr.isTTY ?? false;
    this.startTime = Date.now();

    // Show initial message
    this.render();
  }

  /**
   * Update the total count (useful when total is discovered mid-operation)
   */
  setTotal(total: number): void {
    this.total = total;
  }

  /**
   * Increment progress by 1 and optionally update the label
   */
  tick(label?: string): void {
    this.update(this.current + 1, label);
  }

  /**
   * Set progress to a specific value
   */
  update(current: number, label?: string): void {
    this.current = current;

    // Throttle updates to avoid excessive writes
    const now = Date.now();
    if (now - this.lastUpdateTime < this.throttleMs && current < this.total) {
      return;
    }
    this.lastUpdateTime = now;

    this.render(label);
  }

  /**
   * Create a ProgressCallback compatible with batchGenerateEmbeddings etc.
   */
  toCallback(): ProgressCallback {
    return (current: number, total: number, label?: string) => {
      if (this.total !== total) this.total = total;
      this.update(current, label);
    };
  }

  /**
   * Mark the operation as complete with an optional summary message
   */
  complete(summary?: string): void {
    if (this.finished) return;
    this.finished = true;

    const elapsed = formatElapsed(Date.now() - this.startTime);
    const msg = summary ?? `${this.operation} complete`;
    const line = this.showElapsed ? `${msg} (${elapsed})` : msg;

    if (this.isTTY) {
      // Clear the line and write final message
      this.output(`\r\x1b[K${line}\n`);
    } else {
      this.output(`${line}\n`);
    }
  }

  /**
   * Log a sub-step or phase message (always on a new line)
   */
  log(message: string): void {
    if (this.isTTY) {
      // Clear current progress line, write message, then re-render progress
      this.output(`\r\x1b[K${message}\n`);
      this.render();
    } else {
      this.output(`${message}\n`);
    }
  }

  private render(label?: string): void {
    if (this.finished) return;

    const elapsed = formatElapsed(Date.now() - this.startTime);

    let line: string;
    if (this.total > 0) {
      const pct = Math.round((this.current / this.total) * 100);
      line = `${this.operation} [${this.current}/${this.total}] ${pct}%`;
    } else if (this.current > 0) {
      line = `${this.operation} [${this.current}]`;
    } else {
      line = `${this.operation}...`;
    }

    if (label) {
      line += ` - ${label}`;
    }

    if (this.showElapsed) {
      line += ` (${elapsed})`;
    }

    if (this.isTTY) {
      this.output(`\r\x1b[K${line}`);
    } else {
      this.output(`${line}\n`);
    }
  }
}

/**
 * Create a progress reporter for a multi-phase operation.
 *
 * Returns a helper that manages transitioning between phases,
 * each of which can have its own item-level progress.
 */
export function createMultiPhaseProgress(
  operationName: string,
  phases: string[],
  output?: (text: string) => void
): MultiPhaseProgress {
  return new MultiPhaseProgress(operationName, phases, output);
}

/**
 * Multi-phase progress tracker for operations with distinct stages.
 */
export class MultiPhaseProgress {
  private phases: string[];
  private currentPhase: number = -1;
  private reporter: ProgressReporter | null = null;
  private operationName: string;
  private output: ((text: string) => void) | undefined;
  private startTime: number;

  constructor(
    operationName: string,
    phases: string[],
    output?: (text: string) => void
  ) {
    this.operationName = operationName;
    this.phases = phases;
    this.output = output;
    this.startTime = Date.now();
  }

  /**
   * Start the next phase. Completes the previous phase's reporter.
   */
  nextPhase(itemCount?: number): ProgressReporter {
    // Complete previous phase
    if (this.reporter) {
      this.reporter.complete();
    }

    this.currentPhase++;
    const phaseLabel = this.phases[this.currentPhase] ?? 'Processing';
    const phaseName = `[${this.currentPhase + 1}/${this.phases.length}] ${phaseLabel}`;

    this.reporter = new ProgressReporter({
      operation: phaseName,
      total: itemCount,
      output: this.output,
    });

    return this.reporter;
  }

  /**
   * Get the current phase's reporter (null if no phase started)
   */
  get current(): ProgressReporter | null {
    return this.reporter;
  }

  /**
   * Complete all phases
   */
  complete(summary?: string): void {
    if (this.reporter) {
      this.reporter.complete();
      this.reporter = null;
    }

    const elapsed = formatElapsed(Date.now() - this.startTime);
    const msg = summary ?? `${this.operationName} complete`;
    const out = this.output ?? ((text: string) => process.stderr.write(text));
    out(`${msg} (${elapsed})\n`);
  }
}
