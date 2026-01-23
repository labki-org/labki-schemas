import semver from 'semver'
import { execFileSync } from 'node:child_process'

/**
 * Validate VERSION file format
 *
 * @param {string} version - Version string from VERSION file
 * @returns {{valid: boolean, parsed: object|null, error: string|null}}
 *
 * @example
 * validateVersionFormat('1.0.0')
 * // { valid: true, parsed: { major: 1, minor: 0, patch: 0, ... }, error: null }
 */
export function validateVersionFormat(version) {
  const trimmed = version.trim()
  const parsed = semver.parse(trimmed)

  if (!parsed) {
    return {
      valid: false,
      parsed: null,
      error: `Invalid semver format: "${trimmed}". Expected MAJOR.MINOR.PATCH`
    }
  }

  return { valid: true, parsed, error: null }
}

/**
 * Compare PR version against base branch version
 *
 * @param {string} prVersion - Version in PR
 * @param {string} baseVersion - Version on base branch
 * @returns {{valid: boolean, comparison: number, error: string|null}}
 *
 * @example
 * compareVersions('1.1.0', '1.0.0')
 * // { valid: true, comparison: 1, error: null }
 */
export function compareVersions(prVersion, baseVersion) {
  // Parse both versions first to ensure they're valid
  const prParsed = semver.parse(prVersion)
  const baseParsed = semver.parse(baseVersion)

  if (!prParsed) {
    return {
      valid: false,
      comparison: 0,
      error: `Invalid PR version: "${prVersion}"`
    }
  }

  if (!baseParsed) {
    return {
      valid: false,
      comparison: 0,
      error: `Invalid base version: "${baseVersion}"`
    }
  }

  const comparison = semver.compare(prVersion, baseVersion)

  if (comparison <= 0) {
    return {
      valid: false,
      comparison,
      error: `VERSION ${prVersion} must be greater than base ${baseVersion}`
    }
  }

  return { valid: true, comparison, error: null }
}

/**
 * Get VERSION file content from base branch
 *
 * @param {string} baseBranch - Base branch reference (e.g., 'origin/main')
 * @returns {string|null} Version string or null if VERSION doesn't exist on base
 *
 * @example
 * getBaseVersion('origin/main')
 * // '1.0.0' or null
 */
export function getBaseVersion(baseBranch = 'origin/main') {
  try {
    // Using execFileSync with array args prevents shell injection
    const content = execFileSync('git', ['show', `${baseBranch}:VERSION`], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'] // Suppress stderr
    })
    return content.trim()
  } catch (err) {
    // VERSION doesn't exist on base (new file)
    return null
  }
}
