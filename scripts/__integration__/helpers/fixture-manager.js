import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createTempDir } from '../../__fixtures__/temp-dir.js'
import { ENTITY_TYPES } from '../../lib/constants.js'

/**
 * Create a temporary fixture directory with entity structure
 *
 * Extends createTempDir with additional schema and entity management features.
 *
 * @param {string} name - Fixture name (for temp directory prefix)
 * @returns {Object} Fixture manager
 */
export function createTempFixture(name = 'test-fixture') {
  const tempDir = createTempDir(`${name}-`)

  const fixture = {
    /**
     * Root path of the fixture
     */
    path: tempDir.path,

    /**
     * Write a file to the fixture
     */
    writeFile: tempDir.writeFile.bind(tempDir),

    /**
     * Write a JSON file to the fixture
     */
    writeJSON: tempDir.writeJSON.bind(tempDir),

    /**
     * Read a file from the fixture
     */
    readFile: tempDir.readFile.bind(tempDir),

    /**
     * Read and parse a JSON file
     */
    readJSON: tempDir.readJSON.bind(tempDir),

    /**
     * Check if a file exists
     */
    exists: tempDir.exists.bind(tempDir),

    /**
     * Create standard entity directory structure
     */
    createEntityDirectories() {
      for (const dir of ENTITY_TYPES) {
        tempDir.mkdir(dir)
      }
    },

    /**
     * Write entity schemas to fixture
     */
    writeSchemas() {
      // Minimal schemas for testing
      const schemas = {
        categories: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
            label: { type: 'string' },
            parents: { type: 'array', items: { type: 'string' } },
            required_properties: { type: 'array', items: { type: 'string' } },
            optional_properties: { type: 'array', items: { type: 'string' } }
          }
        },
        properties: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          required: ['id', 'datatype'],
          properties: {
            id: { type: 'string' },
            label: { type: 'string' },
            datatype: { type: 'string' },
            cardinality: { type: 'string' },
            parent_property: { type: 'string' }
          }
        },
        subobjects: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
            label: { type: 'string' },
            required_properties: { type: 'array', items: { type: 'string' } },
            optional_properties: { type: 'array', items: { type: 'string' } }
          }
        },
        templates: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
            label: { type: 'string' }
          }
        },
        modules: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
            version: { type: 'string' },
            categories: { type: 'array', items: { type: 'string' } },
            properties: { type: 'array', items: { type: 'string' } },
            subobjects: { type: 'array', items: { type: 'string' } },
            templates: { type: 'array', items: { type: 'string' } },
            dependencies: { type: 'array', items: { type: 'string' } }
          }
        },
        bundles: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
            version: { type: 'string' },
            modules: { type: 'array', items: { type: 'string' } }
          }
        }
      }

      for (const [type, schema] of Object.entries(schemas)) {
        this.writeJSON(`${type}/_schema.json`, schema)
      }
    },

    /**
     * Write VERSION file
     *
     * @param {string} version - Semver version string
     */
    writeVersion(version) {
      this.writeFile('VERSION', version + '\n')
    },

    /**
     * Clean up the fixture (delete directory)
     */
    cleanup: tempDir.cleanup.bind(tempDir)
  }

  return fixture
}

/**
 * Create a git-initialized fixture for testing git-dependent functionality
 *
 * @param {string} name - Fixture name
 * @returns {Object} Git fixture manager (extends createTempFixture)
 */
export function createGitFixture(name = 'git-fixture') {
  const fixture = createTempFixture(name)

  // Initialize git repo using execFileSync for security
  execFileSync('git', ['init'], { cwd: fixture.path, stdio: 'pipe' })
  execFileSync('git', ['config', 'user.email', 'test@test.com'], { cwd: fixture.path, stdio: 'pipe' })
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: fixture.path, stdio: 'pipe' })

  // Add git-specific methods
  return {
    ...fixture,

    /**
     * Stage and commit all changes
     *
     * @param {string} message - Commit message
     */
    commit(message) {
      execFileSync('git', ['add', '-A'], { cwd: fixture.path, stdio: 'pipe' })
      execFileSync('git', ['commit', '-m', message], { cwd: fixture.path, stdio: 'pipe' })
    },

    /**
     * Create a branch
     *
     * @param {string} branchName - Branch name
     */
    createBranch(branchName) {
      execFileSync('git', ['checkout', '-b', branchName], { cwd: fixture.path, stdio: 'pipe' })
    },

    /**
     * Checkout a branch
     *
     * @param {string} branchName - Branch name
     */
    checkout(branchName) {
      execFileSync('git', ['checkout', branchName], { cwd: fixture.path, stdio: 'pipe' })
    },

    /**
     * Get current branch name
     *
     * @returns {string} Current branch name
     */
    getCurrentBranch() {
      return execFileSync('git', ['branch', '--show-current'], { cwd: fixture.path, encoding: 'utf8' }).trim()
    },

    /**
     * Setup a base branch with initial commit
     */
    setupBaseBranch() {
      fixture.createEntityDirectories()
      fixture.writeSchemas()
      fixture.writeVersion('1.0.0')

      // Create initial structure
      fixture.writeJSON('categories/Agent.json', { id: 'Agent', label: 'Agent' })
      fixture.writeJSON('properties/Name.json', { id: 'Name', label: 'Name', datatype: 'Text' })
      fixture.writeJSON('modules/Core.json', {
        id: 'Core',
        version: '1.0.0',
        categories: ['Agent'],
        properties: ['Name'],
        subobjects: [],
        templates: [],
        dependencies: []
      })
      fixture.writeJSON('bundles/Default.json', {
        id: 'Default',
        version: '1.0.0',
        modules: ['Core']
      })

      this.commit('Initial commit')
    },

    cleanup() {
      fixture.cleanup()
    }
  }
}

/**
 * Clean up a fixture directory
 *
 * @param {string} dir - Directory path
 */
export function cleanupFixture(dir) {
  if (dir && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}
