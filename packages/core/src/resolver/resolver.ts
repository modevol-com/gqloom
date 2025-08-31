import type { StandardSchemaV1 } from "@standard-schema/spec"
import type { GraphQLObjectTypeConfig } from "graphql"
import {
  type MayPromise,
  type Middleware,
  type OmitInUnion,
  type ValueOf,
  applyMiddlewares,
  filterMiddlewares,
  getFieldOptions,
  getOperationOptions,
  getSubscriptionOptions,
  mapValue,
  meta,
} from "../utils"
import { DERIVED_DEPENDENCIES } from "../utils/constants"
import { FIELD_HIDDEN, IS_RESOLVER } from "../utils/symbols"
import { type InferInputI, createInputParser } from "./input"
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
  ResolverPayload,
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
  resolveOrOptions?:
    | ((...args: any) => MayPromise<unknown>)
    | QueryOptions<any, any>
) => {
  if (resolveOrOptions == null) {
    return new QueryChainFactory({ output })
  }

  const options: QueryOptions<any, any> = getOperationOptions(resolveOrOptions)
  return meta({
    ...getFieldOptions(options),
    input: options.input,
    output,
    resolve: options.resolve,
    middlewares: options.middlewares,
    operation: "query",
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

  const options: MutationOptions<any, any> =
    getOperationOptions(resolveOrOptions)
  return meta({
    ...getFieldOptions(options),
    input: options.input,
    output,
    resolve: options.resolve,
    middlewares: options.middlewares,
    operation: "mutation",
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
 * Creates a GraphQL field resolver
 * @param output - The output type definition for the field
 * @param resolveOrOptions - Either a resolve function or options object
 * @returns A GraphQL field resolver
 */
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
  return meta({
    ...getFieldOptions(options, {
      [DERIVED_DEPENDENCIES]: options.dependencies,
    }),
    input: options.input,
    dependencies: options.dependencies,
    output,
    resolve: options.resolve,
    middlewares: options.middlewares,
    operation: "field",
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
    | ((
        payload: ResolverPayload | undefined
      ) => MayPromise<AsyncIterator<unknown>>)
    | SubscriptionOptions<any, any, any>
) {
  if (subscribeOrOptions == null) {
    return new SubscriptionChainFactory({ output })
  }

  const options = getSubscriptionOptions(subscribeOrOptions)
  return meta({
    ...getFieldOptions(options),
    input: options.input,
    output,
    subscribe: options.subscribe,
    resolve: options.resolve ?? defaultSubscriptionResolve,
    middlewares: options.middlewares,
    operation: "subscription",
  }) as Loom.Subscription<any, any, any>
}

/**
 * Factory function for creating GraphQL subscriptions with chainable configuration
 */
export const subscription: SubscriptionFactoryWithChain = Object.assign(
  createSubscription as unknown as SubscriptionFactory,
  SubscriptionChainFactory.methods()
)

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

export interface ResolverMeta<
  TFields extends Record<string, Loom.FieldOrOperation | typeof FIELD_HIDDEN>,
> {
  [IS_RESOLVER]: true
  fields: TFields
  options?: ResolverOptionsWithExtensions
}

/**
 * Base class for chain resolvers
 * @template TFields - The fields or operations to resolve
 */
export class ChainResolver<
  TFields extends Record<string, Loom.FieldOrOperation | typeof FIELD_HIDDEN>,
> implements Loom.Resolver
{
  protected meta: ResolverMeta<TFields>

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
  public get "~meta"(): ResolverMeta<TFields> {
    return this.meta
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

  public toExecutor(...middlewares: Middleware[]): Executor<TFields> {
    const executor: Record<string, (...args: any) => any> = mapValue(
      this["~meta"].fields,
      (field) => this.toExecutorOperation(field, middlewares) ?? mapValue.SKIP
    )

    return executor as Executor<TFields>
  }

  protected toExecutorOperation(
    field: Loom.FieldOrOperation | typeof FIELD_HIDDEN,
    executorMiddlewares: Middleware[]
  ): ((...args: any) => any) | undefined {
    if (field === FIELD_HIDDEN || field["~meta"].operation === "subscription") {
      return undefined
    }

    const operation = field["~meta"].operation
    const middlewares = filterMiddlewares(
      operation,
      executorMiddlewares,
      this.meta.options?.middlewares,
      field["~meta"].middlewares
    )
    if (field["~meta"].operation === "field") {
      const resolve = field["~meta"].resolve
      return (parent, args, payload) => {
        const parseInput = createInputParser(field["~meta"].input, args)
        return applyMiddlewares(
          {
            outputSilk: field["~meta"].output,
            parent,
            payload,
            parseInput,
            operation,
          },
          async () => resolve(parent, await parseInput.getResult(), payload),
          middlewares
        )
      }
    } else {
      const resolve = field["~meta"].resolve
      return (args, payload) => {
        const parseInput = createInputParser(field["~meta"].input, args)
        return applyMiddlewares(
          {
            outputSilk: field["~meta"].output,
            parent: undefined,
            payload,
            parseInput,
            operation,
          },
          async () => resolve(await parseInput.getResult(), payload),
          middlewares
        )
      }
    }
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
  protected meta: ResolverMeta<TFields> & { parent: TParent }

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
  public get "~meta"(): ResolverMeta<TFields> & { parent: TParent } {
    return super["~meta"] as ResolverMeta<TFields> & { parent: TParent }
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
export type Executor<
  TFields extends Record<string, Loom.FieldOrOperation | typeof FIELD_HIDDEN>,
> = {
  [K in keyof TFields]: TFields[K] extends Loom.Field<
    infer TParent,
    infer TOutput,
    infer TInput,
    string[] | undefined
  >
    ? (
        parent: StandardSchemaV1.InferOutput<TParent>,
        args: InferInputI<TInput>,
        payload: ResolverPayload | void
      ) => Promise<StandardSchemaV1.InferOutput<TOutput>>
    : TFields[K] extends Loom.Query<infer TOutput, infer TInput>
      ? (
          args: InferInputI<TInput>,
          payload: ResolverPayload | void
        ) => Promise<StandardSchemaV1.InferOutput<TOutput>>
      : TFields[K] extends Loom.Mutation<infer TOutput, infer TInput>
        ? (
            args: InferInputI<TInput>,
            payload: ResolverPayload | void
          ) => Promise<StandardSchemaV1.InferOutput<TOutput>>
        : never
}

export * from "./resolver-chain-factory"
