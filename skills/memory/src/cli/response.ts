/**
 * CLI Response Formatting
 *
 * Consistent JSON response envelope for all CLI commands.
 * Mirrors the shell implementation's {status, message, data} contract.
 */

/**
 * Standard CLI response envelope
 */
export interface CliResponse<T = unknown> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  error?: string;
}

/**
 * Create a success response
 *
 * @param data - Response payload
 * @param message - Optional human-readable message
 */
export function success<T>(data?: T, message?: string): CliResponse<T> {
  const response: CliResponse<T> = { status: 'success' };
  if (message !== undefined) {
    response.message = message;
  }
  if (data !== undefined) {
    response.data = data;
  }
  return response;
}

/**
 * Create an error response
 *
 * @param error - Error message or Error object
 * @param message - Optional human-readable message
 */
export function error(error: string | Error, message?: string): CliResponse<never> {
  const errorStr = error instanceof Error ? error.message : error;
  const response: CliResponse<never> = {
    status: 'error',
    error: errorStr,
  };
  if (message !== undefined) {
    response.message = message;
  }
  return response;
}

/**
 * Format response as JSON string for output
 *
 * @param response - CLI response to format
 * @param pretty - Whether to pretty-print (default: true)
 */
export function formatResponse<T>(response: CliResponse<T>, pretty = true): string {
  return JSON.stringify(response, null, pretty ? 2 : undefined);
}

/**
 * Output response to stdout and return exit code
 *
 * @param response - CLI response to output
 * @returns Exit code (0 for success, 1 for error)
 */
export function outputResponse<T>(response: CliResponse<T>): number {
  console.log(formatResponse(response));
  return response.status === 'success' ? 0 : 1;
}

/**
 * Wrap an async operation with error handling
 *
 * @param operation - Async function that returns data
 * @param successMessage - Optional message on success
 */
export async function wrapOperation<T>(
  operation: () => Promise<T>,
  successMessage?: string
): Promise<CliResponse<T>> {
  try {
    const data = await operation();
    return success(data, successMessage);
  } catch (err) {
    return error(err instanceof Error ? err : String(err));
  }
}
