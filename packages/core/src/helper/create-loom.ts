import type { SubscriptionShuttle, Subscription } from "../resolver"
import {
  type AnyGraphQLFabric,
  type FieldShuttle,
  type QueryMutationShuttle,
  type ResolverShuttle,
  type AbstractSchemaIO,
  type OperationOrField,
  baseResolver,
  fabricField,
  fabricQuery,
  fabricMutation,
  fabricSubscription,
} from "../resolver"
import type { InputSchema } from "../resolver/input"
import { getOperationOptions, getSubscriptionOptions } from "../utils"

function toFabricInput(
  schema: any,
  toFabric: (schema: any) => AnyGraphQLFabric,
  isSchema: (schema: any) => boolean
): InputSchema<AnyGraphQLFabric> {
  if (isSchema(schema)) {
    return toFabric(schema)
  }
  const record: Record<string, AnyGraphQLFabric> = {}
  for (const [key, value] of Object.entries(schema)) {
    record[key] = toFabric(value)
  }
  return record
}

export function createResolverShuttle<TSchemaIO extends AbstractSchemaIO>(
  toFabric: (schema: TSchemaIO[0]) => AnyGraphQLFabric
): ResolverShuttle<TSchemaIO> {
  return Object.assign(baseResolver, {
    of: ((parent, operations, options) =>
      baseResolver(
        operations as Record<string, OperationOrField<any, any, any>>,
        { ...options, parent: toFabric(parent) }
      )) as ResolverShuttle<TSchemaIO>["of"],
  }) as ResolverShuttle<TSchemaIO>
}

export function createFieldShuttle<TSchemaIO extends AbstractSchemaIO>(
  toFabric: (schema: TSchemaIO[0]) => AnyGraphQLFabric,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): FieldShuttle<TSchemaIO> {
  return (output, resolveOrOptions) => {
    const options = getOperationOptions<"field">(resolveOrOptions)
    return fabricField(toFabric(output), {
      ...options,
      input: toFabricInput(options.input, toFabric, isSchema),
    }) as OperationOrField<any, any, any, "field">
  }
}

export function createQueryShuttle<TSchemaIO extends AbstractSchemaIO>(
  toFabric: (schema: TSchemaIO[0]) => AnyGraphQLFabric,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): QueryMutationShuttle<TSchemaIO> {
  return (output, resolveOrOptions) => {
    const options = getOperationOptions(resolveOrOptions)
    return fabricQuery(toFabric(output), {
      ...options,
      input: toFabricInput(options.input, toFabric, isSchema),
    }) as OperationOrField<any, any, any, "query">
  }
}

export function createMutationShuttle<TSchemaIO extends AbstractSchemaIO>(
  toFabric: (schema: TSchemaIO[0]) => AnyGraphQLFabric,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): QueryMutationShuttle<TSchemaIO> {
  return (output, resolveOrOptions) => {
    const options = getOperationOptions(resolveOrOptions)
    return fabricMutation(toFabric(output), {
      ...options,
      input: toFabricInput(options.input, toFabric, isSchema),
    }) as OperationOrField<any, any, any, "mutation">
  }
}

export function createSubscriptionShuttle<TSchemaIO extends AbstractSchemaIO>(
  toFabric: (schema: TSchemaIO[0]) => AnyGraphQLFabric,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): SubscriptionShuttle<TSchemaIO> {
  return (output, resolveOrOptions) => {
    const options = getSubscriptionOptions(resolveOrOptions)
    return fabricSubscription(toFabric(output), {
      ...options,
      input: toFabricInput(options.input, toFabric, isSchema),
    }) as Subscription<any, any, any>
  }
}

export function createLoom<TSchemaIO extends AbstractSchemaIO>(
  toFabric: (schema: TSchemaIO[0]) => AnyGraphQLFabric,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): {
  query: QueryMutationShuttle<TSchemaIO>
  mutation: QueryMutationShuttle<TSchemaIO>
  field: FieldShuttle<TSchemaIO>
  resolver: ResolverShuttle<TSchemaIO>
  subscription: SubscriptionShuttle<TSchemaIO>
} {
  return {
    query: createQueryShuttle<TSchemaIO>(toFabric, isSchema),
    mutation: createMutationShuttle<TSchemaIO>(toFabric, isSchema),
    field: createFieldShuttle<TSchemaIO>(toFabric, isSchema),
    resolver: createResolverShuttle<TSchemaIO>(toFabric),
    subscription: createSubscriptionShuttle<TSchemaIO>(toFabric, isSchema),
  }
}
