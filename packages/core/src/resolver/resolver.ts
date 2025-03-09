import type { GraphQLObjectTypeConfig } from "graphql"
import {
  type MayPromise,
  type Middleware,
  type OmitInUnion,
  type ValueOf,
  applyMiddlewares,
  compose,
  getFieldOptions,
  getOperationOptions,
  getSubscriptionOptions,
  meta,
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
  resolveOrOptions?: (() => MayPromise<unknown>) | QueryOptions<any, any>
) => {
  if (resolveOrOptions == null) {
    return new QueryChainFactory({ output })
  }

  const options = getOperationOptions(resolveOrOptions)
  const operation = "query"
  return meta({
    ...getFieldOptions(options),
    input: options.input,
    output,
    resolve: (inputValue, extraOptions) => {
      const parseInput = createInputParser(options.input, inputValue)
      return applyMiddlewares(
        compose(extraOptions?.middlewares, options.middlewares),
        async () => options.resolve(getStandardValue(await parseInput())),
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

  const options = getOperationOptions(resolveOrOptions)
  const operation = "mutation"
  return meta({
    ...getFieldOptions(options),
    input: options.input,
    output,
    resolve: (inputValue, extraOptions) => {
      const parseInput = createInputParser(options.input, inputValue)
      return applyMiddlewares(
        compose(extraOptions?.middlewares, options.middlewares),
        async () => options.resolve(getStandardValue(await parseInput())),
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

export const createField = (
  output: GraphQLSilk<any, any>,
  resolveOrOptions?:
    | ((parent: unknown) => unknown)
    | FieldOptions<any, any, any>
) => {
  if (resolveOrOptions == null) {
    return new FieldChainFactory({ output })
  }
  const options = getOperationOptions(resolveOrOptions)
  const operation = "field"
  return meta({
    ...getFieldOptions(options),
    input: options.input,
    output,
    resolve: (parent, inputValue, extraOptions) => {
      const parseInput = createInputParser(options.input, inputValue)
      return applyMiddlewares(
        compose(extraOptions?.middlewares, options.middlewares),
        async () =>
          options.resolve(parent, getStandardValue(await parseInput())),
        { parseInput, parent, outputSilk: output, operation }
      )
    },
    operation,
  }) as Loom.Field<any, any, any>
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
  return meta({
    ...getFieldOptions(options),
    input: options.input,
    output,
    subscribe: (inputValue, extraOptions) => {
      const parseInput = createInputParser(options.input, inputValue)
      return applyMiddlewares(
        compose<Middleware<any>>(
          extraOptions?.middlewares,
          options.middlewares
        ),
        async () => options.subscribe(getStandardValue(await parseInput())),
        { parseInput, parent: undefined, outputSilk: output, operation }
      )
    },
    resolve: options.resolve ?? defaultSubscriptionResolve,
    operation,
  }) as Loom.Subscription<any, any, any>
}

export const subscription: SubscriptionFactoryWithChain = Object.assign(
  createSubscription as SubscriptionFactory,
  SubscriptionChainFactory.methods()
)

function extraOperationOptions<TField extends Loom.FieldOrOperation>(
  field: TField,
  options: ResolverOptionsWithParent<any> | undefined
): TField {
  if (typeof field === "symbol") return field

  const composeMiddlewares = (
    extraOptions: { middlewares?: Middleware[] } | undefined
  ): Middleware[] => compose(extraOptions?.middlewares, options?.middlewares)

  switch (field["~meta"].operation) {
    case "field":
      return {
        ...field,
        "~meta": {
          ...field["~meta"],
          resolve: (parent, input, extraOptions) =>
            field["~meta"].resolve(parent, input, {
              ...extraOptions,
              middlewares: composeMiddlewares(extraOptions),
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
                middlewares: composeMiddlewares(extraOptions),
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
              middlewares: composeMiddlewares(extraOptions),
            }),
        },
      }
  }
}

export const resolver: ResolverFactory = Object.assign(
  ((operations, options) =>
    new ChainResolver(operations, undefined, options)) as ResolverFactory,
  {
    of: ((parent, operations, options) =>
      new ChainResolver(operations, parent, options)) as ResolverFactory["of"],
  }
)

export const loom = {
  query,
  resolver,
  field,
  subscription,
  mutation,
}

export interface ResolverFactory {
  of<
    TParent extends GraphQLSilk,
    TFields extends Record<
      string,
      Loom.Field<TParent, any, any> | Loom.Operation | typeof FIELD_HIDDEN
    >,
  >(
    parent: TParent,
    fields: TFields,
    options?: ResolverOptionsWithExtensions<
      OmitInUnion<ValueOf<TFields>, typeof FIELD_HIDDEN>
    >
  ): ChainResolver<TFields, TParent>

  <TFields extends Record<string, Loom.Operation>>(
    operations: TFields,
    options?: ResolverOptions<ValueOf<TFields>>
  ): ChainResolver<TFields, undefined>
}

export class ChainResolver<
  TFields extends Record<string, Loom.FieldOrOperation | typeof FIELD_HIDDEN>,
  TParent extends GraphQLSilk | undefined = undefined,
> implements Loom.Resolver
{
  protected meta: {
    [IS_RESOLVER]: true
    fields: TFields
    parent: TParent
    options?: ResolverOptionsWithExtensions
  }

  public constructor(
    fields: TFields,
    parent: TParent,
    options?: ResolverOptionsWithExtensions<any>
  ) {
    this.meta = {
      [IS_RESOLVER]: true,
      fields,
      parent,
      options,
    }
  }

  public get "~meta"(): {
    [IS_RESOLVER]: true
    fields: TFields
    parent: TParent
    options?: ResolverOptionsWithExtensions
  } {
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

  public extensions(
    extensions: TParent extends undefined
      ? never
      : Pick<GraphQLObjectTypeConfig<any, any>, "extensions">["extensions"]
  ): this {
    this.meta.options ??= {}
    this.meta.options.extensions ??= {}
    this.meta.options.extensions = {
      ...this.meta.options.extensions,
      ...extensions,
    }
    return this
  }

  public toExecutor(): Executor<TFields> {
    const fields = this["~meta"].fields
    const executor: Record<string, (...args: any) => any> = {}

    Object.entries(fields).forEach(([name, field]) => {
      if (field === FIELD_HIDDEN) return
      executor[name] = field["~meta"].resolve
    })

    return executor as Executor<TFields>
  }
}

type Executor<
  TFields extends Record<string, Loom.FieldOrOperation | typeof FIELD_HIDDEN>,
> = {
  [K in keyof TFields]: TFields[K] extends Loom.FieldOrOperation
    ? TFields[K]["~meta"]["resolve"]
    : never
}
