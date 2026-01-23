/**
 * Constraint validator for entity definitions
 *
 * Checks for overlaps between required and optional arrays
 * (e.g., a property appearing in both required_properties and optional_properties)
 */

/**
 * Find overlap between two arrays
 *
 * @param {string[]|undefined} array1 - First array
 * @param {string[]|undefined} array2 - Second array
 * @returns {string[]} Array of items that appear in both
 */
function findOverlap(array1, array2) {
  if (!array1 || !array2) return []
  const set1 = new Set(array1)
  return array2.filter(item => set1.has(item))
}

/**
 * Validate constraints on entity definitions
 *
 * Checks:
 * - Categories: required_properties vs optional_properties overlap
 * - Categories: required_subobjects vs optional_subobjects overlap
 * - Subobjects: required_properties vs optional_properties overlap
 *
 * @param {Object} entityIndex - Entity index from buildEntityIndex
 * @returns {{errors: Array}} Validation results
 */
export function validateConstraints(entityIndex) {
  const errors = []

  // Check categories for overlaps
  for (const [categoryId, category] of entityIndex.categories) {
    // Check property overlap
    const propertyOverlap = findOverlap(
      category.required_properties,
      category.optional_properties
    )

    if (propertyOverlap.length > 0) {
      errors.push({
        file: category._filePath,
        type: 'property-conflict',
        message: `Property(s) appear in both required_properties and optional_properties: ${propertyOverlap.join(', ')}`
      })
    }

    // Check subobject overlap
    const subobjectOverlap = findOverlap(
      category.required_subobjects,
      category.optional_subobjects
    )

    if (subobjectOverlap.length > 0) {
      errors.push({
        file: category._filePath,
        type: 'subobject-conflict',
        message: `Subobject(s) appear in both required_subobjects and optional_subobjects: ${subobjectOverlap.join(', ')}`
      })
    }
  }

  // Check subobjects for property overlaps
  for (const [subobjectId, subobject] of entityIndex.subobjects) {
    const propertyOverlap = findOverlap(
      subobject.required_properties,
      subobject.optional_properties
    )

    if (propertyOverlap.length > 0) {
      errors.push({
        file: subobject._filePath,
        type: 'property-conflict',
        message: `Property(s) appear in both required_properties and optional_properties: ${propertyOverlap.join(', ')}`
      })
    }
  }

  return { errors }
}
