import { buildModuleDependencyGraph, buildReverseModuleIndex } from './version-cascade.js'

/**
 * Declarative map of entity types to their reference fields and target types
 *
 * Format: { entityType: { fieldName: targetEntityType } }
 */
export const REFERENCE_FIELDS = {
  categories: {
    parents: 'categories',
    required_properties: 'properties',
    optional_properties: 'properties',
    required_subobjects: 'subobjects',
    optional_subobjects: 'subobjects'
  },
  subobjects: {
    required_properties: 'properties',
    optional_properties: 'properties'
  },
  properties: {
    parent_property: 'properties',
    has_display_template: 'templates'
  },
  modules: {
    categories: 'categories',
    properties: 'properties',
    subobjects: 'subobjects',
    templates: 'templates',
    dependencies: 'modules'
  },
  bundles: {
    modules: 'modules'
  }
}

/**
 * Get module scope (own module + transitive dependencies)
 *
 * @param {DepGraph} graph - Module dependency graph
 * @param {string} moduleId - Module to get scope for
 * @returns {Set<string>|null} Set of module IDs in scope, or null if cycle detected
 */
function getModuleScope(graph, moduleId) {
  const scope = new Set([moduleId])

  try {
    // Get transitive dependencies
    const deps = graph.dependenciesOf(moduleId)
    for (const dep of deps) {
      scope.add(dep)
    }
    return scope
  } catch (err) {
    // Cycle detected - return null to skip scope check
    // Phase 3 handles cycle detection properly
    if (err.message && err.message.includes('Dependency Cycle Found')) {
      return null
    }
    throw err
  }
}

/**
 * Normalize a reference value to an array
 *
 * @param {*} value - Reference value (string, array, or undefined)
 * @returns {string[]} Array of reference IDs
 */
function normalizeToArray(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  return [value]
}

/**
 * Validate all references in the entity index
 *
 * @param {Object} entityIndex - Entity index from buildEntityIndex
 * @returns {{errors: Array, warnings: Array}} Validation results
 */
export function validateReferences(entityIndex) {
  const errors = []
  const warnings = []

  // Build dependency graph and reverse index
  const moduleGraph = buildModuleDependencyGraph(entityIndex)
  const reverseModuleIndex = buildReverseModuleIndex(entityIndex)

  // Entity types that need module scope checks
  // (modules and bundles don't - they define scope, not follow it)
  const scopeCheckTypes = new Set(['categories', 'properties', 'subobjects', 'templates'])

  // Validate each entity type that has reference fields
  for (const [entityType, fieldMap] of Object.entries(REFERENCE_FIELDS)) {
    const entities = entityIndex[entityType]

    for (const [entityId, entity] of entities) {
      // Get source module for this entity (if any)
      const entityKey = `${entityType}:${entityId}`
      const sourceModuleId = reverseModuleIndex.get(entityKey)

      // Get module scope (set of accessible modules)
      let moduleScope = null
      if (sourceModuleId && scopeCheckTypes.has(entityType)) {
        moduleScope = getModuleScope(moduleGraph, sourceModuleId)
      }

      // Check each reference field
      for (const [fieldName, targetType] of Object.entries(fieldMap)) {
        const refs = normalizeToArray(entity[fieldName])

        for (const refId of refs) {
          // Self-reference check
          if (refId === entityId && targetType === entityType) {
            errors.push({
              file: entity._filePath,
              type: 'self-reference',
              message: `Self-reference in field "${fieldName}": "${refId}" references itself`
            })
            continue
          }

          // Existence check
          const targetIndex = entityIndex[targetType]
          if (!targetIndex.has(refId)) {
            errors.push({
              file: entity._filePath,
              type: 'missing-reference',
              message: `Missing reference in field "${fieldName}": "${refId}" does not exist in ${targetType}`
            })
            continue
          }

          // Module scope check (skip for modules/bundles and entities not in any module)
          if (moduleScope && scopeCheckTypes.has(entityType) && targetType !== 'modules') {
            const targetKey = `${targetType}:${refId}`
            const targetModuleId = reverseModuleIndex.get(targetKey)

            // If target is in a module, check it's in scope
            if (targetModuleId && !moduleScope.has(targetModuleId)) {
              errors.push({
                file: entity._filePath,
                type: 'scope-violation',
                message: `Module scope violation in field "${fieldName}": "${refId}" is in module "${targetModuleId}" which is not a dependency of "${sourceModuleId}"`
              })
            }
          }
        }
      }
    }
  }

  return { errors, warnings }
}
