import type {
  SubscriptionBobbin,
  Subscription,
  ResolverOptionsWithParent,
} from "../resolver"
import {
  type GraphQLSilk,
  type FieldBobbin,
  type QueryMutationBobbin,
  type ResolverBobbin,
  type AbstractSchemaIO,
  type FieldOrOperation,
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

export function createResolverBobbin<TSchemaIO extends AbstractSchemaIO>(
  toSilk: (schema: TSchemaIO[0]) => GraphQLSilk
): ResolverBobbin<TSchemaIO> {
  return Object.assign(baseResolver, {
    of: ((parent, operations, options) =>
      baseResolver(
        operations as Record<string, FieldOrOperation<any, any, any>>,
        { ...options, parent: toSilk(parent) } as ResolverOptionsWithParent<any>
      )) as ResolverBobbin<TSchemaIO>["of"],
  }) as ResolverBobbin<TSchemaIO>
}

export function createFieldBobbin<TSchemaIO extends AbstractSchemaIO>(
  toSilk: (schema: TSchemaIO[0]) => GraphQLSilk,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): FieldBobbin<TSchemaIO> {
  return (output, resolveOrOptions) => {
    const options = getOperationOptions<"field">(
      resolveOrOptions
    ) as FieldOrOperation<any, any, any, "field">
    return silkField(toSilk(output), {
      ...options,
      input: toSilkInput(options.input, toSilk, isSchema),
    }) as FieldOrOperation<any, any, any, "field">
  }
}

export function createQueryBobbin<TSchemaIO extends AbstractSchemaIO>(
  toSilk: (schema: TSchemaIO[0]) => GraphQLSilk,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): QueryMutationBobbin<TSchemaIO> {
  return (output, resolveOrOptions) => {
    const options = getOperationOptions(resolveOrOptions) as FieldOrOperation<
      any,
      any,
      any,
      "query"
    >
    return silkQuery(toSilk(output), {
      ...options,
      input: toSilkInput(options.input, toSilk, isSchema),
    }) as FieldOrOperation<any, any, any, "query">
  }
}

export function createMutationBobbin<TSchemaIO extends AbstractSchemaIO>(
  toSilk: (schema: TSchemaIO[0]) => GraphQLSilk,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): QueryMutationBobbin<TSchemaIO> {
  return (output, resolveOrOptions) => {
    const options = getOperationOptions(resolveOrOptions) as FieldOrOperation<
      any,
      any,
      any,
      "mutation"
    >
    return silkMutation(toSilk(output), {
      ...options,
      input: toSilkInput(options.input, toSilk, isSchema),
    }) as FieldOrOperation<any, any, any, "mutation">
  }
}

export function createSubscriptionBobbin<TSchemaIO extends AbstractSchemaIO>(
  toSilk: (schema: TSchemaIO[0]) => GraphQLSilk,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): SubscriptionBobbin<TSchemaIO> {
  return (output, resolveOrOptions) => {
    const options = getSubscriptionOptions(resolveOrOptions) as Subscription<
      any,
      any,
      any
    >
    return silkSubscription(toSilk(output), {
      ...options,
      input: toSilkInput(options.input, toSilk, isSchema),
    }) as Subscription<any, any, any>
  }
}

export function createLoom<TSchemaIO extends AbstractSchemaIO>(
  toSilk: (schema: TSchemaIO[0]) => GraphQLSilk,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): {
  query: QueryMutationBobbin<TSchemaIO>
  mutation: QueryMutationBobbin<TSchemaIO>
  field: FieldBobbin<TSchemaIO>
  resolver: ResolverBobbin<TSchemaIO>
  subscription: SubscriptionBobbin<TSchemaIO>
} {
  return {
    query: createQueryBobbin<TSchemaIO>(toSilk, isSchema),
    mutation: createMutationBobbin<TSchemaIO>(toSilk, isSchema),
    field: createFieldBobbin<TSchemaIO>(toSilk, isSchema),
    resolver: createResolverBobbin<TSchemaIO>(toSilk),
    subscription: createSubscriptionBobbin<TSchemaIO>(toSilk, isSchema),
  }
}
