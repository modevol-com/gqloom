import {
  getResolvingFields,
  type ResolverPayload,
  weaverContext,
} from "@gqloom/core"
import {
  type EntityMetadata,
  type EntityName,
  EntitySchema,
  type FilterQuery,
  type MetadataStorage,
} from "@mikro-orm/core"
import type { MikroWeaverConfig } from "./types"

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
  if (!payload) return toFieldHints(["*"])
  for (const p of Array.isArray(payload) ? payload : [payload]) {
    if (!p) continue
    const resolvingFields = getResolvingFields(p)
    for (const field of resolvingFields.selectedFields)
      selectedFields.add(field)
  }
  return toFieldHints(selectedFields)
}

/**
 * GraphQL selection sets are runtime strings. MikroORM's default `Fields=never`
 * types `FindOptions.fields` as `[]`, which is the hint this factory uses.
 */
export function toFieldHints(fields: Iterable<string>): [] {
  return Array.from(fields) as []
}

/**
 * MikroORM 7.1 wraps `findByCursor` options in `NoInfer<Entity>`.
 * `FilterQuery<T>` is invariant, so it is not assignable to
 * `FilterQuery<NoInfer<T>>` when `T` is a type parameter.
 */
export function toMikroFilter<T extends object>(
  where: FilterQuery<T> | null | undefined
): FilterQuery<NoInfer<T>> {
  return (where ?? {}) as FilterQuery<NoInfer<T>>
}

/**
 * Resolve MetadataStorage from weaver config (MikroWeaver.config).
 * Supports ValueOrGetter so config can be () => orm.getMetadata().
 */
export function getWeaverConfigMetadata(): MetadataStorage | undefined {
  const config = weaverContext.getConfig<MikroWeaverConfig>("gqloom.mikro-orm")
  const raw = config?.metadata
  if (raw == null) return undefined
  return typeof raw === "function" ? raw() : raw
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
