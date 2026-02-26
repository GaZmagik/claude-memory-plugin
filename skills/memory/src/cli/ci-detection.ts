/**
 * CI Environment Detection
 *
 * Shared utility to detect CI/CD environments.
 */

/** Environment variables that indicate a CI/CD environment */
const CI_ENV_VARS = [
  'CI',
  'CONTINUOUS_INTEGRATION',
  'GITHUB_ACTIONS',
  'JENKINS_URL',
  'CIRCLECI',
  'TRAVIS',
  'GITLAB_CI',
  'BUILDKITE',
] as const;

/**
 * Detect if the current process is running in a CI/CD environment.
 *
 * Checks for common CI environment variables set by popular CI/CD platforms.
 *
 * @returns `true` if any CI environment variable is set
 */
export function isCI(): boolean {
  return CI_ENV_VARS.some(envVar => !!process.env[envVar]);
}
