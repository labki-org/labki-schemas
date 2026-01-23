/**
 * Orphan detector for entity definitions
 *
 * Finds entities that are not referenced by any module.
 * Orphaned entities are warnings, not errors - they don't block CI.
 */

/**
 * Find entities that are not referenced by any module
 *
 * Checks categories, properties, subobjects, and templates.
 * Does NOT check modules or bundles (they are top-level organizers).
 *
 * @param {Object} entityIndex - Entity index from buildEntityIndex
 * @returns {{warnings: Array}} Detection results
 */
export function findOrphanedEntities(entityIndex) {
  const warnings = []

  // Build a Set of all entities referenced by modules
  const referencedEntities = new Set()

  for (const [moduleId, mod] of entityIndex.modules) {
    for (const cat of (mod.categories || [])) {
      referencedEntities.add(`categories:${cat}`)
    }
    for (const prop of (mod.properties || [])) {
      referencedEntities.add(`properties:${prop}`)
    }
    for (const sub of (mod.subobjects || [])) {
      referencedEntities.add(`subobjects:${sub}`)
    }
    for (const tmpl of (mod.templates || [])) {
      referencedEntities.add(`templates:${tmpl}`)
    }
  }

  // Entity types to check for orphans (NOT modules or bundles)
  const entityTypesToCheck = ['categories', 'properties', 'subobjects', 'templates']

  // Check each entity type
  for (const entityType of entityTypesToCheck) {
    const entities = entityIndex[entityType]

    for (const [entityId, entity] of entities) {
      const key = `${entityType}:${entityId}`

      if (!referencedEntities.has(key)) {
        warnings.push({
          file: entity._filePath,
          type: 'orphaned-entity',
          message: `${entityId} is not referenced by any module`
        })
      }
    }
  }

  return { warnings }
}
