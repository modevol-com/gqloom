import { type ResolverPayload, getResolvingFields } from "@gqloom/core"
import {
  type EntityMetadata,
  type EntityName,
  EntitySchema,
  type MetadataStorage,
} from "@mikro-orm/core"

/**
 * Get the selected columns from the resolver payload
 * @param table - The table to get the selected columns from
 * @param payload - The resolver payload
 * @returns The selected columns
 */
export function getSelectedFields(
  payload: ResolverPayload | (ResolverPayload | undefined)[] | undefined
): [] {
  const selectedFields = new Set<string>()
  if (!payload) return ["*"] as any
  for (const p of Array.isArray(payload) ? payload : [payload]) {
    if (!p) continue
    const resolvingFields = getResolvingFields(p)
    for (const field of resolvingFields.selectedFields)
      selectedFields.add(field)
  }
  return Array.from(selectedFields) as []
}

export function getMetadata<TEntity>(
  entityName: EntityName<TEntity>,
  metadata?: MetadataStorage | undefined
): EntityMetadata<TEntity> {
  if (entityName instanceof EntitySchema) {
    return entityName.init().meta
  }
  if (!metadata) throw new Error("Metadata not found")
  return metadata.get(entityName)
}
