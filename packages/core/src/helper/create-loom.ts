import type { SubscriptionWeaver, Subscription } from "../resolver"
import {
  type AnyGraphQLFabric,
  type FieldWeaver,
  type QueryMutationWeaver,
  type ResolverWeaver,
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

export function createResolverWeaver<TSchemaIO extends AbstractSchemaIO>(
  toFabric: (schema: TSchemaIO[0]) => AnyGraphQLFabric
): ResolverWeaver<TSchemaIO> {
  return Object.assign(baseResolver, {
    of: ((parent, operations, options) =>
      baseResolver(
        operations as Record<string, OperationOrField<any, any, any>>,
        { ...options, parent: toFabric(parent) }
      )) as ResolverWeaver<TSchemaIO>["of"],
  }) as ResolverWeaver<TSchemaIO>
}

export function createFieldWeaver<TSchemaIO extends AbstractSchemaIO>(
  toFabric: (schema: TSchemaIO[0]) => AnyGraphQLFabric,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): FieldWeaver<TSchemaIO> {
  return (output, resolveOrOptions) => {
    const options = getOperationOptions<"field">(resolveOrOptions)
    return fabricField(toFabric(output), {
      ...options,
      input: toFabricInput(options.input, toFabric, isSchema),
    }) as OperationOrField<any, any, any, "field">
  }
}

export function createQueryWeaver<TSchemaIO extends AbstractSchemaIO>(
  toFabric: (schema: TSchemaIO[0]) => AnyGraphQLFabric,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): QueryMutationWeaver<TSchemaIO> {
  return (output, resolveOrOptions) => {
    const options = getOperationOptions(resolveOrOptions)
    return fabricQuery(toFabric(output), {
      ...options,
      input: toFabricInput(options.input, toFabric, isSchema),
    }) as OperationOrField<any, any, any, "query">
  }
}

export function createMutationWeaver<TSchemaIO extends AbstractSchemaIO>(
  toFabric: (schema: TSchemaIO[0]) => AnyGraphQLFabric,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): QueryMutationWeaver<TSchemaIO> {
  return (output, resolveOrOptions) => {
    const options = getOperationOptions(resolveOrOptions)
    return fabricMutation(toFabric(output), {
      ...options,
      input: toFabricInput(options.input, toFabric, isSchema),
    }) as OperationOrField<any, any, any, "mutation">
  }
}

export function createSubscriptionWeaver<TSchemaIO extends AbstractSchemaIO>(
  toFabric: (schema: TSchemaIO[0]) => AnyGraphQLFabric,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): SubscriptionWeaver<TSchemaIO> {
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
  query: QueryMutationWeaver<TSchemaIO>
  mutation: QueryMutationWeaver<TSchemaIO>
  field: FieldWeaver<TSchemaIO>
  resolver: ResolverWeaver<TSchemaIO>
  subscription: SubscriptionWeaver<TSchemaIO>
} {
  return {
    query: createQueryWeaver<TSchemaIO>(toFabric, isSchema),
    mutation: createMutationWeaver<TSchemaIO>(toFabric, isSchema),
    field: createFieldWeaver<TSchemaIO>(toFabric, isSchema),
    resolver: createResolverWeaver<TSchemaIO>(toFabric),
    subscription: createSubscriptionWeaver<TSchemaIO>(toFabric, isSchema),
  }
}
