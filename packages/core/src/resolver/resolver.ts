import type { GraphQLObjectTypeConfig } from "graphql"
import {
  type MayPromise,
  type Middleware,
  type OmitInUnion,
  type ValueOf,
  applyMiddlewares,
  getFieldOptions,
  getOperationOptions,
  getSubscriptionOptions,
  meta,
  resolverPayloadStorage,
} from "../utils"
import { FIELD_HIDDEN, IS_RESOLVER } from "../utils/symbols"
import { createInputParser, getStandardValue } from "./input"
import {
  FieldChainFactory,
  MutationChainFactory,
  QueryChainFactory,
  SubscriptionChainFactory,
} from "./resolver-chain-factory"
import type {
  FieldFactory,
  FieldFactoryWithUtils,
  FieldOptions,
  GraphQLSilk,
  Loom,
  MutationFactory,
  MutationFactoryWithChain,
  MutationOptions,
  QueryFactory,
  QueryFactoryWithChain,
  QueryOptions,
  ResolverOptions,
  ResolverOptionsWithExtensions,
  ResolverOptionsWithParent,
  ResolvingOptions,
  SubscriptionFactory,
  SubscriptionFactoryWithChain,
  SubscriptionOptions,
} from "./types"

export const createQuery = (
  output: GraphQLSilk<any, any>,
  resolveOrOptions?:
    | ((...args: any) => MayPromise<unknown>)
    | QueryOptions<any, any>
) => {
  if (resolveOrOptions == null) {
    return new QueryChainFactory({ output })
  }

  const options: QueryOptions<any, any> = getOperationOptions(resolveOrOptions)
  const operation = "query"
  return meta({
    ...getFieldOptions(options),
    input: options.input,
    output,
    resolve: (inputValue, extraOptions) => {
      const parseInput = createInputParser(options.input, inputValue)
      return applyMiddlewares(
        [...(extraOptions?.middlewares ?? []), ...(options.middlewares ?? [])],
        async () =>
          options.resolve(
            getStandardValue(await parseInput()),
            extraOptions?.payload
          ),
        { parseInput, parent: undefined, outputSilk: output, operation }
      )
    },
    operation,
  }) as Loom.Query<any, any>
}

export const query: QueryFactoryWithChain = Object.assign(
  createQuery as QueryFactory,
  QueryChainFactory.methods()
)

export const createMutation = (
  output: GraphQLSilk<any, any>,
  resolveOrOptions?: (() => MayPromise<unknown>) | MutationOptions<any, any>
) => {
  if (resolveOrOptions == null) {
    return new MutationChainFactory({ output })
  }

  const options: MutationOptions<any, any> =
    getOperationOptions(resolveOrOptions)
  const operation = "mutation"
  return meta({
    ...getFieldOptions(options),
    input: options.input,
    output,
    resolve: (inputValue, extraOptions) => {
      const parseInput = createInputParser(options.input, inputValue)
      return applyMiddlewares(
        [...(extraOptions?.middlewares ?? []), ...(options.middlewares ?? [])],
        async () =>
          options.resolve(
            getStandardValue(await parseInput()),
            extraOptions?.payload
          ),
        { parseInput, parent: undefined, outputSilk: output, operation }
      )
    },
    operation,
  }) as Loom.Mutation<any, any>
}

export const mutation: MutationFactoryWithChain = Object.assign(
  createMutation as MutationFactory,
  MutationChainFactory.methods()
)

export const DERIVED_DEPENDENCIES = "loom.derived-from-dependencies"

export const createField = (
  output: GraphQLSilk<any, any>,
  resolveOrOptions?:
    | (() => unknown)
    | FieldOptions<
        GraphQLSilk,
        GraphQLSilk,
        GraphQLSilk | Record<string, GraphQLSilk> | void,
        string[] | undefined
      >
) => {
  if (resolveOrOptions == null) {
    return new FieldChainFactory({ output })
  }
  const options = getOperationOptions(resolveOrOptions)
  const operation = "field"
  return meta({
    ...getFieldOptions(options, {
      [DERIVED_DEPENDENCIES]: options.dependencies,
    }),
    input: options.input,
    dependencies: options.dependencies,
    output,
    resolve: (parent, inputValue, extraOptions) => {
      const parseInput = createInputParser(options.input, inputValue)
      return applyMiddlewares(
        [...(extraOptions?.middlewares ?? []), ...(options.middlewares ?? [])],
        async () =>
          options.resolve(
            parent,
            getStandardValue(await parseInput()),
            extraOptions?.payload ?? undefined
          ),
        { parseInput, parent, outputSilk: output, operation }
      )
    },
    operation,
  }) as Loom.Field<any, any, any, any>
}

export const field: FieldFactoryWithUtils = Object.assign(
  createField as FieldFactory,
  { hidden: FIELD_HIDDEN as typeof FIELD_HIDDEN },
  FieldChainFactory.methods()
)

export const defaultSubscriptionResolve = (source: any) => source

export function createSubscription(
  output: GraphQLSilk<any, any>
): SubscriptionChainFactory

export function createSubscription(
  output: GraphQLSilk<any, any>,
  subscribeOrOptions:
    | (() => MayPromise<AsyncIterator<unknown>>)
    | SubscriptionOptions<any, any, any>
): Loom.Subscription<any, any, any>

export function createSubscription(
  output: GraphQLSilk<any, any>,
  subscribeOrOptions?:
    | (() => MayPromise<AsyncIterator<unknown>>)
    | SubscriptionOptions<any, any, any>
) {
  if (subscribeOrOptions == null) {
    return new SubscriptionChainFactory({ output })
  }

  const options = getSubscriptionOptions(subscribeOrOptions)
  const operation = "subscription"
  const resolve = options.resolve ?? defaultSubscriptionResolve
  return meta({
    ...getFieldOptions(options),
    input: options.input,
    output,
    subscribe: (inputValue, extraOptions) => {
      const parseInput = createInputParser(options.input, inputValue)
      return applyMiddlewares(
        [...(extraOptions?.middlewares ?? []), ...(options.middlewares ?? [])],
        async () =>
          options.subscribe(
            getStandardValue(await parseInput()),
            extraOptions?.payload
          ),
        { parseInput, parent: undefined, outputSilk: output, operation }
      )
    },
    resolve: (value, input, extraOptions) =>
      resolve(value, input, extraOptions?.payload),
    operation,
  }) as Loom.Subscription<any, any, any>
}

export const subscription: SubscriptionFactoryWithChain = Object.assign(
  createSubscription as unknown as SubscriptionFactory,
  SubscriptionChainFactory.methods()
)

function extraOperationOptions<TField extends Loom.FieldOrOperation>(
  field: TField,
  options: ResolverOptionsWithParent<any> | undefined
): TField {
  if (typeof field === "symbol") return field

  switch (field["~meta"].operation) {
    case "field":
      return {
        ...field,
        "~meta": {
          ...field["~meta"],
          resolve: (parent, input, extraOptions) =>
            field["~meta"].resolve(parent, input, {
              ...extraOptions,
              payload: extraOptions?.payload ?? undefined,
              middlewares: [
                ...(extraOptions?.middlewares ?? []),
                ...(options?.middlewares ?? []),
              ],
            }),
        },
      }
    case "subscription":
      return {
        ...field,
        "~meta": {
          ...field["~meta"],
          subscribe: (input, extraOptions) =>
            (field as Loom.Subscription<any, any, any>)["~meta"].subscribe(
              input,
              {
                ...extraOptions,
                payload: extraOptions?.payload ?? undefined,
                middlewares: [
                  ...(extraOptions?.middlewares ?? []),
                  ...(options?.middlewares ?? []),
                ],
              }
            ),
        },
      }
    default:
      return {
        ...field,
        "~meta": {
          ...field["~meta"],
          resolve: (input: any, extraOptions: ResolvingOptions | undefined) =>
            field["~meta"].resolve(input, {
              ...extraOptions,
              payload: extraOptions?.payload ?? undefined,
              middlewares: [
                ...(extraOptions?.middlewares ?? []),
                ...(options?.middlewares ?? []),
              ],
            }),
        },
      }
  }
}

export const resolver: ResolverFactory = Object.assign(
  ((operations, options) =>
    new ChainResolver(operations, options)) as ResolverFactory,
  {
    of: ((parent, operations, options) =>
      new ObjectChainResolver(
        parent,
        operations,
        options
      )) as ResolverFactory["of"],
  }
)

export const loom = {
  query,
  resolver,
  field,
  subscription,
  mutation,
}

export interface ToExecutorProps {
  memoization?: WeakMap<WeakKey, any>
}

export interface ResolverFactory {
  of<
    TParent extends GraphQLSilk,
    TFields extends Record<
      string,
      Loom.Field<TParent, any, any, any> | Loom.Operation | typeof FIELD_HIDDEN
    >,
  >(
    parent: TParent,
    fields: TFields,
    options?: ResolverOptionsWithExtensions<
      OmitInUnion<ValueOf<TFields>, typeof FIELD_HIDDEN>
    >
  ): ObjectChainResolver<TParent, TFields>

  <TFields extends Record<string, Loom.Operation>>(
    operations: TFields,
    options?: ResolverOptions<ValueOf<TFields>>
  ): ChainResolver<TFields>
}

export class ChainResolver<
  TFields extends Record<string, Loom.FieldOrOperation | typeof FIELD_HIDDEN>,
> implements Loom.Resolver
{
  protected meta: {
    [IS_RESOLVER]: true
    fields: TFields
    options?: ResolverOptionsWithExtensions
  }

  public constructor(
    fields: TFields,
    options?: ResolverOptionsWithExtensions<any>
  ) {
    this.meta = {
      [IS_RESOLVER]: true,
      fields,
      options,
    }
  }

  public get "~meta"(): typeof this.meta {
    const fields: Record<string, Loom.FieldOrOperation | typeof FIELD_HIDDEN> =
      {}

    Object.entries(this.meta.fields).forEach(([name, field]) => {
      if (field === FIELD_HIDDEN) {
        fields[name] = field
      } else {
        fields[name] = extraOperationOptions(field, this.meta.options)
      }
    })

    return {
      ...this.meta,
      fields: fields as TFields,
    }
  }

  public use(
    ...middlewares: Middleware<
      OmitInUnion<ValueOf<TFields>, typeof FIELD_HIDDEN>
    >[]
  ): this {
    this.meta.options ??= {}
    this.meta.options.middlewares ??= []
    this.meta.options.middlewares.push(...(middlewares as Middleware[]))
    return this
  }

  public toExecutor({ memoization }: ToExecutorProps = {}): Executor<TFields> {
    const fields = this["~meta"].fields
    const executor: Record<string, (...args: any) => any> = {}
    const payload = memoization
      ? ({ memoization, isMemoization: true } as const)
      : undefined

    Object.entries(fields).forEach(([name, field]) => {
      if (field === FIELD_HIDDEN) return
      if (payload != null) {
        executor[name] = (...args: any[]) =>
          resolverPayloadStorage.run<any, any[]>(
            payload,
            field["~meta"].resolve,
            ...args
          )
      } else {
        executor[name] = field["~meta"].resolve
      }
    })

    return executor as Executor<TFields>
  }
}

export class ObjectChainResolver<
  TParent extends GraphQLSilk,
  TFields extends Record<string, Loom.FieldOrOperation | typeof FIELD_HIDDEN>,
> extends ChainResolver<TFields> {
  protected meta: {
    [IS_RESOLVER]: true
    fields: TFields
    parent: TParent
    options?: ResolverOptionsWithExtensions
  }

  public constructor(
    parent: TParent,
    fields: TFields,
    options?: ResolverOptionsWithExtensions<any>
  ) {
    super(fields, options)
    this.meta = {
      [IS_RESOLVER]: true,
      fields,
      parent,
      options,
    }
  }

  public get "~meta"(): typeof this.meta {
    return super["~meta"] as typeof this.meta
  }

  public extensions(
    extensions: Pick<
      GraphQLObjectTypeConfig<any, any>,
      "extensions"
    >["extensions"]
  ): this {
    this.meta.options ??= {}
    this.meta.options.extensions ??= {}
    this.meta.options.extensions = {
      ...this.meta.options.extensions,
      ...extensions,
    }
    return this
  }
}

type Executor<
  TFields extends Record<string, Loom.FieldOrOperation | typeof FIELD_HIDDEN>,
> = {
  [K in keyof TFields]: TFields[K] extends Loom.FieldOrOperation
    ? TFields[K]["~meta"]["resolve"]
    : never
}

export * from "./resolver-chain-factory"
