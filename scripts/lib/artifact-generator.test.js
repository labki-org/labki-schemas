import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {
  generateModuleArtifact,
  generateBundleManifest,
  writeVersionedArtifact
} from './artifact-generator.js'

/**
 * Create a mock entity index for isolated testing
 */
function createMockEntityIndex() {
  return {
    modules: new Map([
      ['TestModule', {
        id: 'TestModule',
        version: '1.0.0',
        dependencies: [],
        categories: ['TestCategory'],
        properties: ['TestProperty'],
        subobjects: [],
        templates: []
      }],
      ['DependentModule', {
        id: 'DependentModule',
        version: '2.0.0',
        dependencies: ['TestModule'],
        categories: ['DependentCategory'],
        properties: [],
        subobjects: [],
        templates: []
      }]
    ]),
    bundles: new Map([
      ['TestBundle', {
        id: 'TestBundle',
        version: '1.0.0',
        description: 'Test bundle for unit testing',
        modules: ['TestModule']
      }],
      ['MultiModuleBundle', {
        id: 'MultiModuleBundle',
        version: '1.5.0',
        description: 'Bundle with multiple modules',
        modules: ['TestModule', 'DependentModule']
      }]
    ]),
    categories: new Map([
      ['TestCategory', {
        id: 'TestCategory',
        label: 'Test Category',
        description: 'A test category',
        _filePath: 'categories/TestCategory.json'
      }],
      ['DependentCategory', {
        id: 'DependentCategory',
        label: 'Dependent Category',
        _filePath: 'categories/DependentCategory.json'
      }]
    ]),
    properties: new Map([
      ['TestProperty', {
        id: 'TestProperty',
        label: 'Test Property',
        datatype: 'Text',
        _filePath: 'properties/TestProperty.json'
      }]
    ]),
    subobjects: new Map([
      ['TestSubobject', {
        id: 'TestSubobject',
        label: 'Test Subobject',
        _filePath: 'subobjects/TestSubobject.json'
      }]
    ]),
    templates: new Map([
      ['TestTemplate', {
        id: 'TestTemplate',
        label: 'Test Template',
        _filePath: 'templates/TestTemplate.json'
      }]
    ])
  }
}

describe('generateModuleArtifact', () => {
  it('returns correct structure with all required fields', () => {
    const entityIndex = createMockEntityIndex()
    const artifact = generateModuleArtifact('TestModule', '1.0.0', entityIndex)

    assert.equal(artifact.$schema, 'https://labki.org/schemas/module-version.schema.json')
    assert.equal(artifact.id, 'TestModule')
    assert.equal(artifact.version, '1.0.0')
    assert.ok(artifact.generated)
    assert.deepEqual(artifact.dependencies, {})
  })

  it('includes all entity types', () => {
    const entityIndex = createMockEntityIndex()
    const artifact = generateModuleArtifact('TestModule', '1.0.0', entityIndex)

    assert.ok(Array.isArray(artifact.categories))
    assert.ok(Array.isArray(artifact.properties))
    assert.ok(Array.isArray(artifact.subobjects))
    assert.ok(Array.isArray(artifact.templates))
  })

  it('includes entity content in arrays', () => {
    const entityIndex = createMockEntityIndex()
    const artifact = generateModuleArtifact('TestModule', '1.0.0', entityIndex)

    assert.equal(artifact.categories.length, 1)
    assert.equal(artifact.categories[0].id, 'TestCategory')
    assert.equal(artifact.categories[0].label, 'Test Category')

    assert.equal(artifact.properties.length, 1)
    assert.equal(artifact.properties[0].id, 'TestProperty')
  })

  it('removes _filePath from entities', () => {
    const entityIndex = createMockEntityIndex()
    const artifact = generateModuleArtifact('TestModule', '1.0.0', entityIndex)

    for (const category of artifact.categories) {
      assert.equal(category._filePath, undefined)
    }
    for (const property of artifact.properties) {
      assert.equal(property._filePath, undefined)
    }
  })

  it('resolves dependency versions correctly', () => {
    const entityIndex = createMockEntityIndex()
    const artifact = generateModuleArtifact('DependentModule', '2.0.0', entityIndex)

    assert.deepEqual(artifact.dependencies, { TestModule: '1.0.0' })
  })

  it('throws for missing module', () => {
    const entityIndex = createMockEntityIndex()

    assert.throws(
      () => generateModuleArtifact('NonExistentModule', '1.0.0', entityIndex),
      /Module not found: NonExistentModule/
    )
  })

  it('throws for missing dependency module', () => {
    const entityIndex = createMockEntityIndex()
    // Add a module with a non-existent dependency
    entityIndex.modules.set('BrokenModule', {
      id: 'BrokenModule',
      version: '1.0.0',
      dependencies: ['NonExistent'],
      categories: [],
      properties: [],
      subobjects: [],
      templates: []
    })

    assert.throws(
      () => generateModuleArtifact('BrokenModule', '1.0.0', entityIndex),
      /Dependency module not found: NonExistent/
    )
  })

  it('generated timestamp is valid ISO 8601', () => {
    const entityIndex = createMockEntityIndex()
    const artifact = generateModuleArtifact('TestModule', '1.0.0', entityIndex)

    // Should parse without error
    const date = new Date(artifact.generated)
    assert.ok(!isNaN(date.getTime()))

    // Should match ISO 8601 format
    assert.match(artifact.generated, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
  })

  it('handles module with no entities', () => {
    const entityIndex = createMockEntityIndex()
    entityIndex.modules.set('EmptyModule', {
      id: 'EmptyModule',
      version: '1.0.0',
      dependencies: [],
      categories: [],
      properties: [],
      subobjects: [],
      templates: []
    })

    const artifact = generateModuleArtifact('EmptyModule', '1.0.0', entityIndex)

    assert.deepEqual(artifact.categories, [])
    assert.deepEqual(artifact.properties, [])
    assert.deepEqual(artifact.subobjects, [])
    assert.deepEqual(artifact.templates, [])
  })
})

describe('generateBundleManifest', () => {
  it('returns correct structure with all required fields', () => {
    const entityIndex = createMockEntityIndex()
    const manifest = generateBundleManifest('TestBundle', '1.0.0', entityIndex, '0.1.0')

    assert.equal(manifest.$schema, 'https://labki.org/schemas/bundle-version.schema.json')
    assert.equal(manifest.id, 'TestBundle')
    assert.equal(manifest.version, '1.0.0')
    assert.ok(manifest.generated)
    assert.equal(manifest.ontologyVersion, '0.1.0')
    assert.ok(manifest.modules)
  })

  it('includes description from bundle entity', () => {
    const entityIndex = createMockEntityIndex()
    const manifest = generateBundleManifest('TestBundle', '1.0.0', entityIndex, '0.1.0')

    assert.equal(manifest.description, 'Test bundle for unit testing')
  })

  it('maps module IDs to their versions correctly', () => {
    const entityIndex = createMockEntityIndex()
    const manifest = generateBundleManifest('TestBundle', '1.0.0', entityIndex, '0.1.0')

    assert.deepEqual(manifest.modules, { TestModule: '1.0.0' })
  })

  it('handles bundle with multiple modules', () => {
    const entityIndex = createMockEntityIndex()
    const manifest = generateBundleManifest('MultiModuleBundle', '1.5.0', entityIndex, '0.2.0')

    assert.deepEqual(manifest.modules, {
      TestModule: '1.0.0',
      DependentModule: '2.0.0'
    })
  })

  it('throws for missing bundle', () => {
    const entityIndex = createMockEntityIndex()

    assert.throws(
      () => generateBundleManifest('NonExistentBundle', '1.0.0', entityIndex, '0.1.0'),
      /Bundle not found: NonExistentBundle/
    )
  })

  it('throws for missing module in bundle', () => {
    const entityIndex = createMockEntityIndex()
    // Add a bundle with a non-existent module
    entityIndex.bundles.set('BrokenBundle', {
      id: 'BrokenBundle',
      version: '1.0.0',
      modules: ['NonExistent']
    })

    assert.throws(
      () => generateBundleManifest('BrokenBundle', '1.0.0', entityIndex, '0.1.0'),
      /Module not found in bundle: NonExistent/
    )
  })

  it('generated timestamp is valid ISO 8601', () => {
    const entityIndex = createMockEntityIndex()
    const manifest = generateBundleManifest('TestBundle', '1.0.0', entityIndex, '0.1.0')

    const date = new Date(manifest.generated)
    assert.ok(!isNaN(date.getTime()))
    assert.match(manifest.generated, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
  })

  it('omits description if bundle has none', () => {
    const entityIndex = createMockEntityIndex()
    // Add a bundle without description
    entityIndex.bundles.set('NoDescBundle', {
      id: 'NoDescBundle',
      version: '1.0.0',
      modules: ['TestModule']
    })

    const manifest = generateBundleManifest('NoDescBundle', '1.0.0', entityIndex, '0.1.0')

    assert.equal(manifest.description, undefined)
  })
})

describe('writeVersionedArtifact', () => {
  let tempDir

  beforeEach(() => {
    // Create unique temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-test-'))
  })

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('creates directory structure if not exists', () => {
    const artifact = { id: 'Test', version: '1.0.0' }
    const baseDir = path.join(tempDir, 'modules')

    writeVersionedArtifact(baseDir, 'TestModule', '1.0.0', artifact)

    const expectedDir = path.join(baseDir, 'TestModule', 'versions')
    assert.ok(fs.existsSync(expectedDir))
  })

  it('writes JSON with 2-space indent', () => {
    const artifact = { id: 'Test', version: '1.0.0', data: { nested: true } }
    const baseDir = path.join(tempDir, 'modules')

    writeVersionedArtifact(baseDir, 'TestModule', '1.0.0', artifact)

    const content = fs.readFileSync(
      path.join(baseDir, 'TestModule', 'versions', '1.0.0.json'),
      'utf8'
    )

    // Check 2-space indent
    assert.ok(content.includes('  "id"'))
    assert.ok(content.includes('    "nested"'))
  })

  it('returns correct output path', () => {
    const artifact = { id: 'Test' }
    const baseDir = path.join(tempDir, 'bundles')

    const result = writeVersionedArtifact(baseDir, 'MyBundle', '2.0.0', artifact)

    assert.equal(result, path.join(baseDir, 'MyBundle', 'versions', '2.0.0.json'))
  })

  it('file ends with newline', () => {
    const artifact = { id: 'Test' }
    const baseDir = path.join(tempDir, 'modules')

    writeVersionedArtifact(baseDir, 'TestModule', '1.0.0', artifact)

    const content = fs.readFileSync(
      path.join(baseDir, 'TestModule', 'versions', '1.0.0.json'),
      'utf8'
    )

    assert.ok(content.endsWith('\n'))
  })

  it('overwrites existing file', () => {
    const baseDir = path.join(tempDir, 'modules')
    const artifact1 = { id: 'Test', value: 1 }
    const artifact2 = { id: 'Test', value: 2 }

    writeVersionedArtifact(baseDir, 'TestModule', '1.0.0', artifact1)
    writeVersionedArtifact(baseDir, 'TestModule', '1.0.0', artifact2)

    const content = fs.readFileSync(
      path.join(baseDir, 'TestModule', 'versions', '1.0.0.json'),
      'utf8'
    )
    const parsed = JSON.parse(content)

    assert.equal(parsed.value, 2)
  })

  it('handles different version formats', () => {
    const baseDir = path.join(tempDir, 'modules')
    const artifact = { id: 'Test' }

    const path1 = writeVersionedArtifact(baseDir, 'Module', '1.0.0', artifact)
    const path2 = writeVersionedArtifact(baseDir, 'Module', '10.20.30', artifact)

    assert.ok(fs.existsSync(path1))
    assert.ok(fs.existsSync(path2))
    assert.ok(path1.endsWith('1.0.0.json'))
    assert.ok(path2.endsWith('10.20.30.json'))
  })
})
