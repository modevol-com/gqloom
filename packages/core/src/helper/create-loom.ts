import type {
  FieldFactoryWithUtils,
  FieldOptions,
  MutationFactory,
  QueryFactory,
  QueryMutationOptions,
  ResolverOptionsWithParent,
  Subscription,
  SubscriptionFactory,
  SubscriptionOptions,
} from "../resolver"
import {
  type AbstractSchemaIO,
  type FieldFactory,
  type FieldOrOperation,
  type GraphQLSilk,
  type ResolverFactory,
  baseResolver,
  field,
  mutation,
  query,
  subscription,
} from "../resolver"
import type { InputSchema } from "../resolver/input"
import {
  FieldChainFactory,
  MutationChainFactory,
  QueryChainFactory,
  SubscriptionChainFactory,
} from "../resolver/resolver-chain-factory"
import {
  type MayPromise,
  getOperationOptions,
  getSubscriptionOptions,
} from "../utils"
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
  const baseFieldFunc = (
    output: TSchemaIO[0],
    resolveOrOptions?:
      | ((parent: unknown) => unknown)
      | FieldOptions<TSchemaIO, any, any, any>
  ) => {
    if (resolveOrOptions == null) {
      return new FieldChainFactory({ output: toSilk(output) })
    }
    const options = getOperationOptions<"field">(
      resolveOrOptions
    ) as FieldOrOperation<any, any, any, "field">
    return field(toSilk(output), {
      ...options,
      input: toSilkInput(options.input, toSilk, isSchema),
    }) as FieldOrOperation<any, any, any, "field">
  }
  return Object.assign(
    baseFieldFunc as FieldFactory<TSchemaIO>,
    { hidden: FIELD_HIDDEN as typeof FIELD_HIDDEN },
    FieldChainFactory.methods()
  )
}

export function createQueryFactory<TSchemaIO extends AbstractSchemaIO>(
  toSilk: (schema: TSchemaIO[0]) => GraphQLSilk,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): QueryFactory<TSchemaIO> {
  return ((
    output: TSchemaIO[0],
    resolveOrOptions?:
      | (() => MayPromise<unknown>)
      | QueryMutationOptions<TSchemaIO, any, any>
  ) => {
    if (resolveOrOptions == null) {
      return new QueryChainFactory({ output: toSilk(output) })
    }
    const options = getOperationOptions(resolveOrOptions) as FieldOrOperation<
      any,
      any,
      any,
      "query"
    >
    return query(toSilk(output), {
      ...options,
      input: toSilkInput(options.input, toSilk, isSchema),
    }) as FieldOrOperation<any, any, any, "query">
  }) as QueryFactory<TSchemaIO>
}

export function createMutationFactory<TSchemaIO extends AbstractSchemaIO>(
  toSilk: (schema: TSchemaIO[0]) => GraphQLSilk,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): MutationFactory<TSchemaIO> {
  return ((
    output: TSchemaIO[0],
    resolveOrOptions?:
      | (() => MayPromise<unknown>)
      | QueryMutationOptions<TSchemaIO, any, any>
  ) => {
    if (resolveOrOptions == null) {
      return new MutationChainFactory({ output: toSilk(output) })
    }
    const options = getOperationOptions(resolveOrOptions) as FieldOrOperation<
      any,
      any,
      any,
      "mutation"
    >
    return mutation(toSilk(output), {
      ...options,
      input: toSilkInput(options.input, toSilk, isSchema),
    }) as FieldOrOperation<any, any, any, "mutation">
  }) as MutationFactory<TSchemaIO>
}

export function createSubscriptionFactory<TSchemaIO extends AbstractSchemaIO>(
  toSilk: (schema: TSchemaIO[0]) => GraphQLSilk,
  isSchema: (schema: InputSchema<TSchemaIO[0]>) => boolean
): SubscriptionFactory<TSchemaIO> {
  return ((
    output: TSchemaIO[0],
    resolveOrOptions?:
      | (() => MayPromise<AsyncIterator<unknown>>)
      | SubscriptionOptions<TSchemaIO, any, any, any>
  ) => {
    if (resolveOrOptions == null) {
      return new SubscriptionChainFactory({ output: toSilk(output) })
    }
    const options = getSubscriptionOptions(resolveOrOptions) as Subscription<
      any,
      any,
      any
    >
    return subscription(toSilk(output), {
      ...options,
      input: toSilkInput(options.input, toSilk, isSchema),
    }) as Subscription<any, any, any>
  }) as SubscriptionFactory<TSchemaIO>
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
