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

/**
 * Creates a GraphQL query resolver
 * @param output - The output type definition for the query
 * @param resolveOrOptions - Either a resolve function or options object
 * @returns A GraphQL query resolver
 */
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

/**
 * Factory function for creating GraphQL queries with chainable configuration
 */
export const query: QueryFactoryWithChain = Object.assign(
  createQuery as QueryFactory,
  QueryChainFactory.methods()
)

/**
 * Creates a GraphQL mutation resolver
 * @param output - The output type definition for the mutation
 * @param resolveOrOptions - Either a resolve function or options object
 * @returns A GraphQL mutation resolver
 */
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

/**
 * Factory function for creating GraphQL mutations with chainable configuration
 */
export const mutation: MutationFactoryWithChain = Object.assign(
  createMutation as MutationFactory,
  MutationChainFactory.methods()
)

/**
 * Symbol used to mark derived dependencies in field options
 */
export const DERIVED_DEPENDENCIES = "loom.derived-from-dependencies"

/**
 * Creates a GraphQL field resolver
 * @param output - The output type definition for the field
 * @param resolveOrOptions - Either a resolve function or options object
 * @returns A GraphQL field resolver
 */
export const createField = (
  output: GraphQLSilk<any, any>,
  resolveOrOptions?:
    | ((parent: unknown) => unknown)
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
        compose(extraOptions?.middlewares, options.middlewares),
        async () =>
          options.resolve(parent, getStandardValue(await parseInput())),
        { parseInput, parent, outputSilk: output, operation }
      )
    },
    operation,
  }) as Loom.Field<any, any, any, any>
}

/**
 * Factory function for creating GraphQL fields with chainable configuration
 */
export const field: FieldFactoryWithUtils = Object.assign(
  createField as FieldFactory,
  { hidden: FIELD_HIDDEN as typeof FIELD_HIDDEN },
  FieldChainFactory.methods()
)

/**
 * Default subscription resolver that returns the source value
 * @param source - The source value to resolve
 */
export const defaultSubscriptionResolve = (source: any) => source

/**
 * Creates a GraphQL subscription resolver
 * @param output - The output type definition for the subscription
 * @returns A subscription chain factory
 */
export function createSubscription(
  output: GraphQLSilk<any, any>
): SubscriptionChainFactory

/**
 * Creates a GraphQL subscription resolver with subscribe function
 * @param output - The output type definition for the subscription
 * @param subscribeOrOptions - Either a subscribe function or options object
 * @returns A GraphQL subscription resolver
 */
export function createSubscription(
  output: GraphQLSilk<any, any>,
  subscribeOrOptions:
    | (() => MayPromise<AsyncIterator<unknown>>)
    | SubscriptionOptions<any, any, any>
): Loom.Subscription<any, any, any>

/**
 * Creates a GraphQL subscription resolver
 * @param output - The output type definition for the subscription
 * @param subscribeOrOptions - Optional subscribe function or options object
 * @returns A GraphQL subscription resolver or chain factory
 */
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

/**
 * Factory function for creating GraphQL subscriptions with chainable configuration
 */
export const subscription: SubscriptionFactoryWithChain = Object.assign(
  createSubscription as unknown as SubscriptionFactory,
  SubscriptionChainFactory.methods()
)

/**
 * Applies extra operation options to a field
 * @param field - The field to apply options to
 * @param options - The options to apply
 * @returns The field with applied options
 */
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

/**
 * Factory function for creating GraphQL resolvers
 */
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

/**
 * Collection of factory functions for creating GraphQL operations
 */
export const loom = {
  query,
  resolver,
  field,
  subscription,
  mutation,
}

/**
 * Properties for creating an executor
 */
export interface ToExecutorProps {
  /** WeakMap for memoization */
  memoization?: WeakMap<WeakKey, any>
}

/**
 * Factory interface for creating GraphQL resolvers
 */
export interface ResolverFactory {
  /**
   * Creates a resolver for an object type
   * @template TParent - The parent type
   * @template TFields - The fields of the object type
   * @param parent - The parent type definition
   * @param fields - The fields to resolve
   * @param options - Optional resolver options
   */
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

  /**
   * Creates a resolver for operations
   * @template TFields - The operations to resolve
   * @param operations - The operations to resolve
   * @param options - Optional resolver options
   */
  <TFields extends Record<string, Loom.Operation>>(
    operations: TFields,
    options?: ResolverOptions<ValueOf<TFields>>
  ): ChainResolver<TFields>
}

/**
 * Base class for chain resolvers
 * @template TFields - The fields or operations to resolve
 */
export class ChainResolver<
  TFields extends Record<string, Loom.FieldOrOperation | typeof FIELD_HIDDEN>,
> implements Loom.Resolver
{
  protected meta: {
    [IS_RESOLVER]: true
    fields: TFields
    options?: ResolverOptionsWithExtensions
  }

  /**
   * Creates a new chain resolver
   * @param fields - The fields or operations to resolve
   * @param options - Optional resolver options
   */
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

  /**
   * Gets the metadata for the resolver
   */
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

  /**
   * Adds middleware functions to the resolver
   * @param middlewares - The middleware functions to add
   */
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

  /**
   * Creates an executor for the resolver
   * @param props - Optional properties for the executor
   */
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

/**
 * Class for resolving object types
 * @template TParent - The parent type
 * @template TFields - The fields to resolve
 */
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

  /**
   * Creates a new object chain resolver
   * @param parent - The parent type definition
   * @param fields - The fields to resolve
   * @param options - Optional resolver options
   */
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

  /**
   * Gets the metadata for the resolver
   */
  public get "~meta"(): typeof this.meta {
    return super["~meta"] as typeof this.meta
  }

  /**
   * Sets custom extensions for the resolver
   * @param extensions - The extensions to add
   */
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

/**
 * Type for the executor of a resolver
 * @template TFields - The fields or operations to resolve
 */
type Executor<
  TFields extends Record<string, Loom.FieldOrOperation | typeof FIELD_HIDDEN>,
> = {
  [K in keyof TFields]: TFields[K] extends Loom.FieldOrOperation
    ? TFields[K]["~meta"]["resolve"]
    : never
}

export * from "./resolver-chain-factory"
