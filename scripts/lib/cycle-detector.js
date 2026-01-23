import { DepGraph } from 'dependency-graph'

/**
 * Build a graph from category inheritance (parents[])
 * @param {Map<string, object>} categories - Category entities from index
 * @returns {DepGraph} Graph where edges represent inheritance
 */
function buildCategoryGraph(categories) {
  const graph = new DepGraph()

  // First pass: add all categories as nodes
  for (const [categoryId] of categories) {
    graph.addNode(categoryId)
  }

  // Second pass: add inheritance edges
  for (const [categoryId, category] of categories) {
    const parents = category.parents || []
    for (const parentId of parents) {
      // Only add edge if parent exists (missing refs caught by Phase 2)
      if (graph.hasNode(parentId)) {
        // Category depends on its parent (child -> parent)
        graph.addDependency(categoryId, parentId)
      }
    }
  }

  return graph
}

/**
 * Build a graph from module dependencies (dependencies[])
 * @param {Map<string, object>} modules - Module entities from index
 * @returns {DepGraph} Graph where edges represent dependencies
 */
function buildModuleGraph(modules) {
  const graph = new DepGraph()

  // First pass: add all modules as nodes
  for (const [moduleId] of modules) {
    graph.addNode(moduleId)
  }

  // Second pass: add dependency edges
  for (const [moduleId, mod] of modules) {
    const dependencies = mod.dependencies || []
    for (const depId of dependencies) {
      if (graph.hasNode(depId)) {
        graph.addDependency(moduleId, depId)
      }
    }
  }

  return graph
}

/**
 * Build a graph from property parent chains (parent_property)
 * @param {Map<string, object>} properties - Property entities from index
 * @returns {DepGraph} Graph where edges represent parent relationships
 */
function buildPropertyGraph(properties) {
  const graph = new DepGraph()

  // First pass: add all properties as nodes
  for (const [propertyId] of properties) {
    graph.addNode(propertyId)
  }

  // Second pass: add parent edges
  for (const [propertyId, property] of properties) {
    const parentId = property.parent_property
    if (parentId && graph.hasNode(parentId)) {
      // Property depends on its parent
      graph.addDependency(propertyId, parentId)
    }
  }

  return graph
}

/**
 * Check a graph for cycles and return errors
 * @param {DepGraph} graph - Graph to check
 * @param {string} graphType - Human-readable type name
 * @param {Map<string, object>} entityMap - Entity map for file path lookup
 * @returns {Array} Array of error objects
 */
function checkForCycles(graph, graphType, entityMap) {
  const errors = []

  try {
    graph.overallOrder()  // Throws DepGraphCycleError if cycle exists
  } catch (err) {
    if (err.cyclePath) {
      const cyclePath = err.cyclePath
      const cycleStr = cyclePath.join(' -> ')

      // Get file path from first entity in cycle
      const firstEntityId = cyclePath[0]
      const entity = entityMap.get(firstEntityId)
      const filePath = entity ? entity._filePath : 'unknown'

      errors.push({
        file: filePath,
        type: `circular-${graphType.replace(/ /g, '-')}`,
        message: `Circular ${graphType} detected: ${cycleStr}`
      })
    } else {
      // Re-throw unexpected errors
      throw err
    }
  }

  return errors
}

/**
 * Detect cycles in all three graph types
 * @param {Object} entityIndex - Entity index from buildEntityIndex
 * @returns {{errors: Array}} Detection results
 */
export function detectCycles(entityIndex) {
  const errors = []

  // Check category inheritance cycles (GRPH-01)
  const categoryGraph = buildCategoryGraph(entityIndex.categories)
  errors.push(...checkForCycles(
    categoryGraph,
    'category inheritance',
    entityIndex.categories
  ))

  // Check module dependency cycles (GRPH-02)
  const moduleGraph = buildModuleGraph(entityIndex.modules)
  errors.push(...checkForCycles(
    moduleGraph,
    'module dependency',
    entityIndex.modules
  ))

  // Check property parent_property cycles (GRPH-03)
  const propertyGraph = buildPropertyGraph(entityIndex.properties)
  errors.push(...checkForCycles(
    propertyGraph,
    'property parent_property',
    entityIndex.properties
  ))

  return { errors }
}
