import type { SubscriptionShuttle, Subscription } from "../resolver"
import {
  type GraphQLSilk,
  type FieldShuttle,
  type QueryMutationShuttle,
  type ResolverShuttle,
  type AbstractSchemaIO,
  type OperationOrField,
  baseResolver,
  silkField,
  silkQuery,
  silkMutation,
  silkSubscription,
} from "../resolver"
import type { InputSchema } from "../resolver/input"
import { getOperationOptions, getSubscriptionOptions } from "../utils"

function toSilkInput(
  schema: any,
  toSilk: (schema: any) => GraphQLSilk,
  isSchema: (schema: any) => boolean
): InputSchema<GraphQLSilk> {
  if (schema == null) {
    return schema
  }
  if (isSchema(schema)) {
    return toSilk(schema)
  }
  const record: Record<string, GraphQLSilk> = {}
  for (const [key, value] of Object.entries(schema)) {
    record[key] = toSilk(value)
  }
  return record
}

export function createResolverShuttle<TSchemaIO extends AbstractSchemaIO>(
  toSilk: (schema: TSchemaIO[0]) => GraphQLSilk
): ResolverShuttle<TSchemaIO> {
  return Object.assign(baseResolver, {
    of: ((parent, operations, options) =>
      baseResolver(
        operations as Record<string, OperationOrField<any, any, any>>,
        { ...options, parent: toSilk(parent) }
      )) as ResolverShuttle<TSchemaIO>["of"],
  }) as ResolverShuttle<TSchemaIO>
}

export function createFieldShuttle<TSchemaIO extends AbstractSchemaIO>(
  toSilk: (schema: TSchemaIO[0]) => GraphQLSilk,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): FieldShuttle<TSchemaIO> {
  return (output, resolveOrOptions) => {
    const options = getOperationOptions<"field">(resolveOrOptions)
    return silkField(toSilk(output), {
      ...options,
      input: toSilkInput(options.input, toSilk, isSchema),
    }) as OperationOrField<any, any, any, "field">
  }
}

export function createQueryShuttle<TSchemaIO extends AbstractSchemaIO>(
  toSilk: (schema: TSchemaIO[0]) => GraphQLSilk,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): QueryMutationShuttle<TSchemaIO> {
  return (output, resolveOrOptions) => {
    const options = getOperationOptions(resolveOrOptions)
    return silkQuery(toSilk(output), {
      ...options,
      input: toSilkInput(options.input, toSilk, isSchema),
    }) as OperationOrField<any, any, any, "query">
  }
}

export function createMutationShuttle<TSchemaIO extends AbstractSchemaIO>(
  toSilk: (schema: TSchemaIO[0]) => GraphQLSilk,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): QueryMutationShuttle<TSchemaIO> {
  return (output, resolveOrOptions) => {
    const options = getOperationOptions(resolveOrOptions)
    return silkMutation(toSilk(output), {
      ...options,
      input: toSilkInput(options.input, toSilk, isSchema),
    }) as OperationOrField<any, any, any, "mutation">
  }
}

export function createSubscriptionShuttle<TSchemaIO extends AbstractSchemaIO>(
  toSilk: (schema: TSchemaIO[0]) => GraphQLSilk,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): SubscriptionShuttle<TSchemaIO> {
  return (output, resolveOrOptions) => {
    const options = getSubscriptionOptions(resolveOrOptions)
    return silkSubscription(toSilk(output), {
      ...options,
      input: toSilkInput(options.input, toSilk, isSchema),
    }) as Subscription<any, any, any>
  }
}
// TODO: created Loom should accept GraphQLSilk
export function createLoom<TSchemaIO extends AbstractSchemaIO>(
  toSilk: (schema: TSchemaIO[0]) => GraphQLSilk,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): {
  query: QueryMutationShuttle<TSchemaIO>
  mutation: QueryMutationShuttle<TSchemaIO>
  field: FieldShuttle<TSchemaIO>
  resolver: ResolverShuttle<TSchemaIO>
  subscription: SubscriptionShuttle<TSchemaIO>
} {
  return {
    query: createQueryShuttle<TSchemaIO>(toSilk, isSchema),
    mutation: createMutationShuttle<TSchemaIO>(toSilk, isSchema),
    field: createFieldShuttle<TSchemaIO>(toSilk, isSchema),
    resolver: createResolverShuttle<TSchemaIO>(toSilk),
    subscription: createSubscriptionShuttle<TSchemaIO>(toSilk, isSchema),
  }
}
