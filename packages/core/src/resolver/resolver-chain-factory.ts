import type { StandardSchemaV1 } from "@standard-schema/spec"
import type { GraphQLResolveInfo } from "graphql"
import {
  LoomDataLoader,
  type MayPromise,
  type Middleware,
  type RequireKeys,
} from "../utils"
import { getMemoizationMap } from "../utils/context"
import type { InferInputO } from "./input"
import {
  createField,
  createMutation,
  createQuery,
  createSubscription,
  loom,
} from "./resolver"
import type {
  FieldOptions,
  GraphQLFieldOptions,
  GraphQLSilk,
  Loom,
  MutationOptions,
  QueryOptions,
  ResolverPayload,
} from "./types"

/**
 * Interface for chain factory that provides methods to configure GraphQL field options
 * @template TOutput - The output type of the GraphQL field
 * @template TInput - The input type of the GraphQL field, can be a single type or a record of types
 */
export interface IChainFactory<
  TOutput extends GraphQLSilk,
  TInput extends GraphQLSilk | Record<string, GraphQLSilk> | void = void,
> {
  /**
   * Sets the description for the GraphQL field
   * @param description - The description text for the field
   */
  description(description: GraphQLFieldOptions["description"]): this

  /**
   * Sets the deprecation reason for the GraphQL field
   * @param deprecationReason - The reason why this field is deprecated
   */
  deprecationReason(
    deprecationReason: GraphQLFieldOptions["deprecationReason"]
  ): this

  /**
   * Sets custom extensions for the GraphQL field
   * @param extensions - Custom extensions to be added to the field
   */
  extensions(extensions: GraphQLFieldOptions["extensions"]): this

  /**
   * Sets the output type for the GraphQL field
   * @template TOutputNew - The new output type
   * @param output - The output type definition
   */
  output<TOutputNew extends GraphQLSilk>(
    output: TOutputNew
  ): IChainFactory<TOutputNew, TInput>

  /**
   * Sets the input type for the GraphQL field
   * @template TInputNew - The new input type
   * @param input - The input type definition
   */
  input<TInputNew extends GraphQLSilk | Record<string, GraphQLSilk>>(
    input: TInputNew
  ): IChainFactory<TOutput, TInputNew>
}

/**
 * Options for configuring a chain factory
 */
export interface ChainFactoryOptions extends Loom.FieldMeta {
  /** Middleware functions to be applied to the field */
  middlewares?: Middleware[] | undefined
}

/**
 * Base class for all chain factories
 * @template TField - The type of field being created
 */
export abstract class BaseChainFactory<TField extends Loom.BaseField = any> {
  /**
   * Returns the available methods for the chain factory
   */
  public static methods() {
    return {
      description: BaseChainFactory.prototype.description,
      deprecationReason: BaseChainFactory.prototype.deprecationReason,
      extensions: BaseChainFactory.prototype.extensions,
    }
  }

  /**
   * Creates a new instance of the chain factory
   * @param options - Configuration options for the factory
   */
  public constructor(
    protected readonly options?: Partial<ChainFactoryOptions>
  ) {}

  /**
   * Creates a clone of the current factory with new options
   * @param options - New options to apply to the clone
   */
  protected abstract clone(options?: Partial<ChainFactoryOptions>): this

  /**
   * Sets the description for the field
   * @param description - The description text
   */
  public description(description: GraphQLFieldOptions["description"]): this {
    return this.clone({ description })
  }

  /**
   * Sets the deprecation reason for the field
   * @param deprecationReason - The reason for deprecation
   */
  public deprecationReason(
    deprecationReason: GraphQLFieldOptions["deprecationReason"]
  ): this {
    return this.clone({ deprecationReason })
  }

  /**
   * Sets custom extensions for the field
   * @param extensions - Custom extensions to add
   */
  public extensions(extensions: GraphQLFieldOptions["extensions"]): this {
    return this.clone({ extensions })
  }

  /**
   * Adds middleware functions to the field
   * @param middlewares - Middleware functions to add
   */
  public use(...middlewares: Middleware<TField>[]): this {
    return this.clone({
      middlewares: [...(this.options?.middlewares ?? []), ...middlewares],
    })
  }
}

class FieldLoader<
  TParent extends GraphQLSilk,
  TOutput extends GraphQLSilk,
  TInput extends GraphQLSilk | Record<string, GraphQLSilk> | void = void,
  TDependencies extends string[] | undefined = undefined,
> extends LoomDataLoader<
  [
    parent: InferParent<TParent, TDependencies>,
    input: InferInputO<TInput>,
    payload: ResolverPayload | undefined,
  ],
  any
> {
  public static getByPath<
    TParent extends GraphQLSilk,
    TOutput extends GraphQLSilk,
    TInput extends GraphQLSilk | Record<string, GraphQLSilk> | void = void,
    TDependencies extends string[] | undefined = undefined,
  >(
    payload: ResolverPayload | undefined,
    resolve: (
      parents: InferParent<TParent, TDependencies>[],
      input: InferInputO<TInput>,
      payloads: (ResolverPayload | undefined)[]
    ) => MayPromise<StandardSchemaV1.InferOutput<TOutput>[]>,
    getByPath: boolean = true
  ) {
    if (!payload) return new FieldLoader(resolve)
    const memoMap = getMemoizationMap(payload)
    if (!getByPath) {
      const loader = memoMap.get(resolve) ?? new FieldLoader(resolve)
      memoMap.set(resolve, loader)
      return loader
    }
    const fullPath: GraphQLResolveInfo["path"][] = []
    let path: GraphQLResolveInfo["path"] | undefined = payload.info.path
    while (path) {
      fullPath.push(path)
      path = path.prev
    }
    const pathKey = fullPath
      .reverse()
      .map((p) => (typeof p.key === "number" ? "[n]" : p.key))
      .join(".")
    const fieldLoaders =
      memoMap.get(resolve) ??
      new Map<string, FieldLoader<TParent, TOutput, TInput, TDependencies>>()
    memoMap.set(resolve, fieldLoaders)
    const fieldLoader = fieldLoaders.get(pathKey) ?? new FieldLoader(resolve)
    fieldLoaders.set(pathKey, fieldLoader)
    return fieldLoader
  }

  public constructor(
    protected readonly resolve: (
      parents: InferParent<TParent, TDependencies>[],
      input: InferInputO<TInput>,
      payloads: (ResolverPayload | undefined)[]
    ) => MayPromise<StandardSchemaV1.InferOutput<TOutput>[]>
  ) {
    super()
  }

  protected batchLoad(
    args: [
      parent: InferParent<TParent, TDependencies>,
      input: InferInputO<TInput>,
      payload: ResolverPayload<object, Loom.BaseField> | undefined,
    ][]
  ): Promise<any[]> {
    const parents = args.map(([parent]) => parent)
    const payloads = args.map(([, , payload]) => payload)
    return this.resolve(parents, args[0]?.[1], payloads) as any
  }
}

/**
 * Factory for creating field resolvers with chainable configuration
 * @template TOutput - The output type of the field
 * @template TInput - The input type of the field
 * @template TDependencies - The dependencies of the field
 */
export class FieldChainFactory<
    TOutput extends GraphQLSilk = never,
    TInput extends
      | GraphQLSilk
      | Record<string, GraphQLSilk>
      | undefined = undefined,
    TDependencies extends string[] | undefined = undefined,
  >
  extends BaseChainFactory<Loom.Field<any, TOutput, TInput, TDependencies>>
  implements IChainFactory<TOutput, TInput>
{
  /**
   * Returns the available methods for the field chain factory
   */
  public static methods() {
    return {
      ...BaseChainFactory.methods(),
      output: FieldChainFactory.prototype.output,
      input: FieldChainFactory.prototype.input,
      resolve: FieldChainFactory.prototype.resolve,
      clone: FieldChainFactory.prototype.clone,
    } as any as FieldChainFactory<never, undefined>
  }

  /**
   * Creates a clone of the current factory with new options
   * @param options - New options to apply to the clone
   */
  protected clone(options?: Partial<ChainFactoryOptions>): this {
    return new FieldChainFactory({ ...this.options, ...options }) as this
  }

  /**
   * Sets the output type for the field
   * @template TOutputNew - The new output type
   * @param output - The output type definition
   */
  public output<TOutputNew extends GraphQLSilk>(
    output: TOutputNew
  ): FieldChainFactory<TOutputNew, TInput, TDependencies> {
    return new FieldChainFactory({ ...this.options, output })
  }

  /**
   * Sets the input type for the field
   * @template TInputNew - The new input type
   * @param input - The input type definition
   */
  public input<
    TInputNew extends
      | GraphQLSilk<any, Record<string, any>>
      | Record<string, GraphQLSilk>,
  >(input: TInputNew): FieldChainFactory<TOutput, TInputNew, TDependencies> {
    return new FieldChainFactory({ ...this.options, input })
  }

  /**
   * Specifies the dependencies for the field
   * @template TDependencies - The dependencies type
   * @param dependencies - The dependencies to add
   */
  public derivedFrom<const TDependencies extends string[]>(
    ...dependencies: TDependencies
  ): FieldChainFactory<TOutput, TInput, TDependencies> {
    return this.clone({ dependencies }) as any
  }

  /**
   * Sets the resolve function for the field
   * @template TParent - The parent type
   * @param resolve - The resolve function
   */
  public resolve<TParent extends GraphQLSilk>(
    resolve: (
      parent: TDependencies extends string[]
        ? RequireKeys<
            NonNullable<StandardSchemaV1.InferOutput<TParent>>,
            TDependencies[number]
          >
        : NonNullable<StandardSchemaV1.InferOutput<TParent>>,
      input: InferInputO<TInput>,
      payload: ResolverPayload | undefined
    ) => MayPromise<StandardSchemaV1.InferOutput<TOutput>>
  ): Loom.Field<TParent, TOutput, TInput, TDependencies> {
    if (!this.options?.output) throw new Error("Output is required")
    return createField(this.options.output, {
      ...this.options,
      resolve,
    }) as any
  }

  /**
   * Creates a field resolver that uses DataLoader for batch loading data.
   * This method is particularly useful for optimizing performance when dealing with multiple data requests
   * by batching them together and handling caching automatically.
   *
   * @template TParent - The parent type that extends GraphQLSilk
   * @param resolve - A function that handles batch loading of data.
   * @returns A GraphQL field resolver that implements batch loading
   */
  public load<TParent extends GraphQLSilk>(
    resolve: (
      parents: InferParent<TParent, TDependencies>[],
      input: InferInputO<TInput>,
      payloads: (ResolverPayload | undefined)[]
    ) => MayPromise<StandardSchemaV1.InferOutput<TOutput>[]>
  ): Loom.Field<TParent, TOutput, TInput, TDependencies> {
    if (!this.options?.output) throw new Error("Output is required")
    return createField(this.options.output, {
      ...this.options,
      resolve: (parent, input, payload) => {
        const loader = FieldLoader.getByPath(
          payload,
          resolve,
          this.options?.input != null
        )
        return loader.load([parent, input, payload])
      },
    }) as any
  }
}

type InferParent<
  TParent extends GraphQLSilk,
  TDependencies extends string[] | undefined = undefined,
> = TDependencies extends string[]
  ? RequireKeys<
      NonNullable<StandardSchemaV1.InferOutput<TParent>>,
      TDependencies[number]
    >
  : NonNullable<StandardSchemaV1.InferOutput<TParent>>

/**
 * Factory for creating query resolvers with chainable configuration
 * @template TOutput - The output type of the query
 * @template TInput - The input type of the query
 */
export class QueryChainFactory<
    TOutput extends GraphQLSilk = never,
    TInput extends GraphQLSilk | Record<string, GraphQLSilk> | void = void,
  >
  extends BaseChainFactory<Loom.Query<TOutput, TInput>>
  implements IChainFactory<TOutput, TInput>
{
  /**
   * Returns the available methods for the query chain factory
   * @returns An object containing all available methods
   */
  public static methods() {
    return {
      ...BaseChainFactory.methods(),
      output: QueryChainFactory.prototype.output,
      input: QueryChainFactory.prototype.input,
      resolve: QueryChainFactory.prototype.resolve,
      clone: QueryChainFactory.prototype.clone,
    } as any as QueryChainFactory<never, void>
  }

  /**
   * Creates a clone of the current factory with new options
   * @param options - New options to apply to the clone
   * @returns A new instance of QueryChainFactory with the updated options
   */
  protected clone(options?: Partial<ChainFactoryOptions>): this {
    return new QueryChainFactory({ ...this.options, ...options }) as this
  }

  /**
   * Sets the output type for the query
   * @template TOutputNew - The new output type
   * @param output - The output type definition
   * @returns A new QueryChainFactory instance with the updated output type
   */
  public output<TOutputNew extends GraphQLSilk>(
    output: TOutputNew
  ): QueryChainFactory<TOutputNew, TInput> {
    return new QueryChainFactory({ ...this.options, output })
  }

  /**
   * Sets the input type for the query
   * @template TInputNew - The new input type
   * @param input - The input type definition
   * @returns A new QueryChainFactory instance with the updated input type
   */
  public input<
    TInputNew extends
      | GraphQLSilk<any, Record<string, any>>
      | Record<string, GraphQLSilk>,
  >(input: TInputNew): QueryChainFactory<TOutput, TInputNew> {
    return new QueryChainFactory({ ...this.options, input })
  }

  /**
   * Sets the resolve function for the query
   * @param resolve - The resolve function that processes the input and returns the output
   * @returns A GraphQL query resolver
   * @throws {Error} If output type is not set
   */
  public resolve(
    resolve: (
      input: InferInputO<TInput>,
      payload: ResolverPayload | undefined
    ) => MayPromise<StandardSchemaV1.InferOutput<TOutput>>
  ): Loom.Query<TOutput, TInput> {
    if (!this.options?.output) throw new Error("Output is required")
    return createQuery(this.options.output, {
      ...this.options,
      resolve,
    }) as any
  }
}

/**
 * Factory for creating mutation resolvers with chainable configuration
 * @template TOutput - The output type of the mutation
 * @template TInput - The input type of the mutation
 */
export class MutationChainFactory<
    TOutput extends GraphQLSilk = never,
    TInput extends
      | GraphQLSilk
      | Record<string, GraphQLSilk>
      | undefined = undefined,
  >
  extends BaseChainFactory<Loom.Mutation<TOutput, TInput>>
  implements IChainFactory<TOutput, TInput>
{
  /**
   * Returns the available methods for the mutation chain factory
   * @returns An object containing all available methods
   */
  public static methods() {
    return {
      ...BaseChainFactory.methods(),
      output: MutationChainFactory.prototype.output,
      input: MutationChainFactory.prototype.input,
      resolve: MutationChainFactory.prototype.resolve,
      clone: MutationChainFactory.prototype.clone,
    } as any as MutationChainFactory<never, undefined>
  }

  /**
   * Creates a clone of the current factory with new options
   * @param options - New options to apply to the clone
   * @returns A new instance of MutationChainFactory with the updated options
   */
  protected clone(options?: Partial<ChainFactoryOptions>): this {
    return new MutationChainFactory({ ...this.options, ...options }) as this
  }

  /**
   * Sets the output type for the mutation
   * @template TOutputNew - The new output type
   * @param output - The output type definition
   * @returns A new MutationChainFactory instance with the updated output type
   */
  public output<TOutputNew extends GraphQLSilk>(
    output: TOutputNew
  ): MutationChainFactory<TOutputNew, TInput> {
    return new MutationChainFactory({ ...this.options, output })
  }

  /**
   * Sets the input type for the mutation
   * @template TInputNew - The new input type
   * @param input - The input type definition
   * @returns A new MutationChainFactory instance with the updated input type
   */
  public input<
    TInputNew extends
      | GraphQLSilk<any, Record<string, any>>
      | Record<string, GraphQLSilk>,
  >(input: TInputNew): MutationChainFactory<TOutput, TInputNew> {
    return new MutationChainFactory({ ...this.options, input })
  }

  /**
   * Sets the resolve function for the mutation
   * @param resolve - The resolve function that processes the input and returns the output
   * @returns A GraphQL mutation resolver
   * @throws {Error} If output type is not set
   */
  public resolve(
    resolve: (
      input: InferInputO<TInput>,
      payload: ResolverPayload | undefined
    ) => MayPromise<StandardSchemaV1.InferOutput<TOutput>>
  ): Loom.Mutation<TOutput, TInput> {
    if (!this.options?.output) throw new Error("Output is required")
    return createMutation(this.options.output, {
      ...this.options,
      resolve,
    }) as any
  }
}

/**
 * Factory for creating subscription resolvers with chainable configuration
 * @template TOutput - The output type of the subscription
 * @template TInput - The input type of the subscription
 */
export class SubscriptionChainFactory<
    TOutput extends GraphQLSilk = never,
    TInput extends
      | GraphQLSilk
      | Record<string, GraphQLSilk>
      | undefined = undefined,
  >
  extends BaseChainFactory<Loom.Subscription<TOutput, TInput, any>>
  implements IChainFactory<TOutput, TInput>
{
  /**
   * Returns the available methods for the subscription chain factory
   * @returns An object containing all available methods
   */
  public static methods() {
    return {
      ...BaseChainFactory.methods(),
      output: SubscriptionChainFactory.prototype.output,
      input: SubscriptionChainFactory.prototype.input,
      subscribe: SubscriptionChainFactory.prototype.subscribe,
      clone: SubscriptionChainFactory.prototype.clone,
    } as any as SubscriptionChainFactory<never, undefined>
  }

  /**
   * Creates a clone of the current factory with new options
   * @param options - New options to apply to the clone
   * @returns A new instance of SubscriptionChainFactory with the updated options
   */
  protected clone(options?: Partial<ChainFactoryOptions>): this {
    return new SubscriptionChainFactory({ ...this.options, ...options }) as this
  }

  /**
   * Sets the output type for the subscription
   * @template TOutputNew - The new output type
   * @param output - The output type definition
   * @returns A new SubscriptionChainFactory instance with the updated output type
   */
  public output<TOutputNew extends GraphQLSilk>(
    output: TOutputNew
  ): SubscriptionChainFactory<TOutputNew, TInput> {
    return new SubscriptionChainFactory({ ...this.options, output })
  }

  /**
   * Sets the input type for the subscription
   * @template TInputNew - The new input type
   * @param input - The input type definition
   * @returns A new SubscriptionChainFactory instance with the updated input type
   */
  public input<
    TInputNew extends
      | GraphQLSilk<any, Record<string, any>>
      | Record<string, GraphQLSilk>,
  >(input: TInputNew): SubscriptionChainFactory<TOutput, TInputNew> {
    return new SubscriptionChainFactory({ ...this.options, input })
  }

  /**
   * Sets the subscribe function for the subscription
   * @template TValue - The value type of the subscription
   * @param subscribe - The subscribe function that returns an AsyncIterator
   * @returns A subscription resolver that can be further configured with a resolve function
   * @throws {Error} If output type is not set
   */
  public subscribe<TValue = StandardSchemaV1.InferOutput<TOutput>>(
    subscribe: (
      input: InferInputO<TInput>,
      payload: ResolverPayload | undefined
    ) => MayPromise<AsyncIterator<TValue>>
  ): TValue extends StandardSchemaV1.InferOutput<TOutput>
    ? ResolvableSubscription<TOutput, TInput, TValue>
    : SubscriptionNeedResolve<TOutput, TInput, TValue> {
    const options = this.options
    const output = this.options?.output
    if (!output) throw new Error("Output is required")
    const subscription = createSubscription(output, {
      ...options,
      subscribe,
    })

    const subscriptionResolve = subscription["~meta"].resolve

    const resolve = (...args: any[]) => {
      if (args.length === 1 && typeof args[0] === "function") {
        return createSubscription(output, {
          ...options,
          resolve: args[0],
          subscribe,
        })
      }
      return subscriptionResolve(...(args as [any, any]))
    }

    return Object.assign(subscription, { resolve }) as any
  }
}

/**
 * Interface for a subscription that can be resolved
 * @template TOutput - The output type of the subscription
 * @template TInput - The input type of the subscription
 * @template TValue - The value type of the subscription
 */
export interface ResolvableSubscription<
  TOutput extends GraphQLSilk,
  TInput extends
    | GraphQLSilk
    | Record<string, GraphQLSilk>
    | undefined = undefined,
  TValue = StandardSchemaV1.InferOutput<TOutput>,
> extends Loom.Subscription<TOutput, TInput, TValue> {
  /**
   * Sets the resolve function for the subscription
   * @param resolve - The resolve function
   */
  resolve(
    resolve: (
      value: TValue,
      input: InferInputO<TInput>,
      payload: ResolverPayload | undefined
    ) => MayPromise<StandardSchemaV1.InferOutput<TOutput>>
  ): Loom.Subscription<TOutput, TInput, TValue>
}

/**
 * A subscription that can not be resolved yet, still needs to be resolved.
 * Interface for a subscription that needs to be resolved
 * @template TOutput - The output type of the subscription
 * @template TInput - The input type of the subscription
 * @template TValue - The value type of the subscription
 */
export interface SubscriptionNeedResolve<
  TOutput extends GraphQLSilk,
  TInput extends
    | GraphQLSilk
    | Record<string, GraphQLSilk>
    | undefined = undefined,
  TValue = StandardSchemaV1.InferOutput<TOutput>,
> {
  /**
   * Sets the resolve function for the subscription
   * @param resolve - The resolve function
   */
  resolve(
    resolve: (
      value: TValue,
      input: InferInputO<TInput>,
      payload: ResolverPayload | undefined
    ) => MayPromise<StandardSchemaV1.InferOutput<TOutput>>
  ): Loom.Subscription<TOutput, TInput, TValue>
}

export class QueryFactoryWithResolve<
    TInputO,
    TOutput extends GraphQLSilk,
    TInput extends GraphQLSilk<TInputO>,
  >
  extends BaseChainFactory<Loom.Query<TOutput, TInput>>
  implements Loom.Query<TOutput, TInput>
{
  public get "~meta"(): Loom.Query<TOutput, TInput>["~meta"] {
    return loom.query(this.outputSilk, this.options)["~meta"]
  }

  public constructor(
    protected outputSilk: TOutput,
    protected readonly options: QueryOptions<TOutput, TInput>
  ) {
    super(options)
  }

  protected clone(
    options?: Partial<QueryOptions<TOutput, TInput>> | undefined
  ): this {
    return new QueryFactoryWithResolve(this.outputSilk, {
      ...this.options,
      ...options,
    }) as this
  }

  public input<TInputNew extends GraphQLSilk<TInputO, Record<string, any>>>(
    input: TInputNew
  ): QueryFactoryWithResolve<TInputO, TOutput, TInputNew> {
    return new QueryFactoryWithResolve(this.outputSilk, {
      ...this.options,
      input,
    } as QueryOptions<any, any>)
  }

  public output<TOutputNew extends GraphQLSilk>(
    output: TOutputNew,
    transform: (
      output: StandardSchemaV1.InferOutput<TOutput>
    ) => MayPromise<StandardSchemaV1.InferOutput<TOutputNew>>
  ): QueryFactoryWithResolve<TInputO, TOutputNew, TInput> {
    return new QueryFactoryWithResolve(output, {
      ...this.options,
      middlewares: [
        ...(this.options.middlewares ?? []),
        async (next) => transform(await next()),
      ],
    } as QueryOptions<any, any>)
  }
}

export class MutationFactoryWithResolve<
    TInputO,
    TOutput extends GraphQLSilk,
    TInput extends GraphQLSilk<TInputO>,
  >
  extends BaseChainFactory<Loom.Query<TOutput, TInput>>
  implements Loom.Mutation<TOutput, TInput>
{
  public get "~meta"(): Loom.Mutation<TOutput, TInput>["~meta"] {
    return loom.mutation(this.outputSilk, this.options)["~meta"]
  }

  public constructor(
    protected outputSilk: TOutput,
    protected readonly options: MutationOptions<TOutput, TInput>
  ) {
    super(options)
  }

  protected clone(
    options?: Partial<MutationOptions<TOutput, TInput>> | undefined
  ): this {
    return new MutationFactoryWithResolve(this.outputSilk, {
      ...this.options,
      ...options,
    }) as this
  }

  public input<TInputNew extends GraphQLSilk<TInputO, Record<string, any>>>(
    input: TInputNew
  ): MutationFactoryWithResolve<TInputO, TOutput, TInputNew> {
    return new MutationFactoryWithResolve(this.outputSilk, {
      ...this.options,
      input,
    } as MutationOptions<any, any>)
  }

  public output<TOutputNew extends GraphQLSilk>(
    output: TOutputNew,
    transform: (
      output: StandardSchemaV1.InferOutput<TOutput>
    ) => MayPromise<StandardSchemaV1.InferOutput<TOutputNew>>
  ): MutationFactoryWithResolve<TInputO, TOutputNew, TInput> {
    return new MutationFactoryWithResolve(output, {
      ...this.options,
      middlewares: [
        ...(this.options.middlewares ?? []),
        async (next) => transform(await next()),
      ],
    } as MutationOptions<any, any>)
  }
}

export class FieldFactoryWithResolve<
  TParent extends GraphQLSilk,
  TOutput extends GraphQLSilk,
  TInputO = never,
  TInput extends GraphQLSilk<TInputO> | void = void,
> extends BaseChainFactory<
  Loom.Field<TParent, TOutput, TInput, string[] | undefined>
> {
  public get "~meta"(): Loom.Field<
    TParent,
    TOutput,
    TInput,
    string[] | undefined
  >["~meta"] {
    return loom.field<TParent, TOutput, any, string[] | undefined>(
      this.outputSilk,
      this.options as any
    )["~meta"] as any
  }

  public constructor(
    protected outputSilk: TOutput,
    protected readonly options: FieldOptions<
      TParent,
      TOutput,
      TInput,
      string[] | undefined
    >
  ) {
    super(options)
  }

  protected clone(
    options?:
      | Partial<FieldOptions<TParent, TOutput, TInput, string[] | undefined>>
      | undefined
  ): this {
    return new FieldFactoryWithResolve(this.outputSilk, {
      ...this.options,
      ...options,
    }) as this
  }

  public input<TInputNew extends GraphQLSilk<TInputO, Record<string, any>>>(
    input: TInputNew
  ): FieldFactoryWithResolve<TParent, TOutput, TInputO, TInputNew> {
    return new FieldFactoryWithResolve(this.outputSilk, {
      ...this.options,
      input,
    } as FieldOptions<any, any, any, any>)
  }

  public output<TOutputNew extends GraphQLSilk>(
    output: TOutputNew,
    transform: (
      output: StandardSchemaV1.InferOutput<TOutput>
    ) => MayPromise<StandardSchemaV1.InferOutput<TOutputNew>>
  ): FieldFactoryWithResolve<TParent, TOutputNew, TInputO, TInput> {
    return new FieldFactoryWithResolve(output, {
      ...this.options,
      middlewares: [
        ...(this.options.middlewares ?? []),
        async (next) => transform(await next()),
      ],
    } as FieldOptions<any, any, any, any>)
  }
}
