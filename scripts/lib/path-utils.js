/**
 * Parse entity type and ID from a file path
 *
 * @param {string} filePath - File path like 'properties/Name.json'
 * @returns {{entityType: string, entityId: string}} Parsed entity info
 *
 * @example
 * parseEntityPath('properties/Name.json')
 * // { entityType: 'properties', entityId: 'Name' }
 */
export function parseEntityPath(filePath) {
  const parts = filePath.split('/')
  return {
    entityType: parts[0],
    entityId: parts[parts.length - 1].replace('.json', '')
  }
}
