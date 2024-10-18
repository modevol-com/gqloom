import type {
  SubscriptionFactory,
  Subscription,
  ResolverOptionsWithParent,
  QueryFactory,
  MutationFactory,
  FieldFactoryWithUtils,
} from "../resolver"
import {
  type GraphQLSilk,
  type FieldFactory,
  type ResolverFactory,
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
import { FIELD_HIDDEN } from "../utils/symbols"

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

export function createResolverFactory<TSchemaIO extends AbstractSchemaIO>(
  toSilk: (schema: TSchemaIO[0]) => GraphQLSilk
): ResolverFactory<TSchemaIO> {
  return Object.assign(baseResolver, {
    of: ((parent, operations, options) =>
      baseResolver(
        operations as Record<string, FieldOrOperation<any, any, any>>,
        { ...options, parent: toSilk(parent) } as ResolverOptionsWithParent<any>
      )) as ResolverFactory<TSchemaIO>["of"],
  }) as ResolverFactory<TSchemaIO>
}

export function createFieldFactory<TSchemaIO extends AbstractSchemaIO>(
  toSilk: (schema: TSchemaIO[0]) => GraphQLSilk,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): FieldFactoryWithUtils<TSchemaIO> {
  const baseFieldFunc: FieldFactory<TSchemaIO> = (output, resolveOrOptions) => {
    const options = getOperationOptions<"field">(
      resolveOrOptions
    ) as FieldOrOperation<any, any, any, "field">
    return silkField(toSilk(output), {
      ...options,
      input: toSilkInput(options.input, toSilk, isSchema),
    }) as FieldOrOperation<any, any, any, "field">
  }
  return Object.assign(baseFieldFunc, {
    hidden: FIELD_HIDDEN as typeof FIELD_HIDDEN,
  })
}

export function createQueryFactory<TSchemaIO extends AbstractSchemaIO>(
  toSilk: (schema: TSchemaIO[0]) => GraphQLSilk,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): QueryFactory<TSchemaIO> {
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

export function createMutationFactory<TSchemaIO extends AbstractSchemaIO>(
  toSilk: (schema: TSchemaIO[0]) => GraphQLSilk,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): MutationFactory<TSchemaIO> {
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

export function createSubscriptionFactory<TSchemaIO extends AbstractSchemaIO>(
  toSilk: (schema: TSchemaIO[0]) => GraphQLSilk,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): SubscriptionFactory<TSchemaIO> {
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
  query: QueryFactory<TSchemaIO>
  mutation: MutationFactory<TSchemaIO>
  field: FieldFactoryWithUtils<TSchemaIO>
  resolver: ResolverFactory<TSchemaIO>
  subscription: SubscriptionFactory<TSchemaIO>
} {
  return {
    query: createQueryFactory<TSchemaIO>(toSilk, isSchema),
    mutation: createMutationFactory<TSchemaIO>(toSilk, isSchema),
    field: createFieldFactory<TSchemaIO>(toSilk, isSchema),
    resolver: createResolverFactory<TSchemaIO>(toSilk),
    subscription: createSubscriptionFactory<TSchemaIO>(toSilk, isSchema),
  }
}
