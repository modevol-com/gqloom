import type { StandardSchemaV1 } from "@standard-schema/spec"
import type { MayPromise, Middleware, RequireKeys } from "../utils"
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

export interface IChainFactory<
  TOutput extends GraphQLSilk,
  TInput extends GraphQLSilk | Record<string, GraphQLSilk> | void = void,
> {
  description(description: GraphQLFieldOptions["description"]): this

  deprecationReason(
    deprecationReason: GraphQLFieldOptions["deprecationReason"]
  ): this

  extensions(extensions: GraphQLFieldOptions["extensions"]): this

  output<TOutputNew extends GraphQLSilk>(
    output: TOutputNew
  ): IChainFactory<TOutputNew, TInput>

  input<TInputNew extends GraphQLSilk | Record<string, GraphQLSilk>>(
    input: TInputNew
  ): IChainFactory<TOutput, TInputNew>
}

export interface ChainFactoryOptions extends Loom.FieldMeta {
  middlewares?: Middleware[]
}

export abstract class BaseChainFactory<TField extends Loom.BaseField = any> {
  public static methods() {
    return {
      description: BaseChainFactory.prototype.description,
      deprecationReason: BaseChainFactory.prototype.deprecationReason,
      extensions: BaseChainFactory.prototype.extensions,
    }
  }

  public constructor(
    protected readonly options?: Partial<ChainFactoryOptions>
  ) {}

  protected abstract clone(options?: Partial<ChainFactoryOptions>): this

  public description(description: GraphQLFieldOptions["description"]): this {
    return this.clone({ description })
  }

  public deprecationReason(
    deprecationReason: GraphQLFieldOptions["deprecationReason"]
  ): this {
    return this.clone({ deprecationReason })
  }

  public extensions(extensions: GraphQLFieldOptions["extensions"]): this {
    return this.clone({ extensions })
  }

  public use(...middlewares: Middleware<TField>[]): this {
    return this.clone({
      middlewares: [...(this.options?.middlewares ?? []), ...middlewares],
    })
  }
}

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
  public static methods() {
    return {
      ...BaseChainFactory.methods(),
      output: FieldChainFactory.prototype.output,
      input: FieldChainFactory.prototype.input,
      resolve: FieldChainFactory.prototype.resolve,
      clone: FieldChainFactory.prototype.clone,
    } as any as FieldChainFactory<never, undefined>
  }

  protected clone(options?: Partial<ChainFactoryOptions>): this {
    return new FieldChainFactory({ ...this.options, ...options }) as this
  }

  public output<TOutputNew extends GraphQLSilk>(
    output: TOutputNew
  ): FieldChainFactory<TOutputNew, TInput, TDependencies> {
    return new FieldChainFactory({ ...this.options, output })
  }

  public input<TInputNew extends GraphQLSilk | Record<string, GraphQLSilk>>(
    input: TInputNew
  ): FieldChainFactory<TOutput, TInputNew, TDependencies> {
    return new FieldChainFactory({ ...this.options, input })
  }

  public derivedFrom<const TDependencies extends string[]>(
    ...dependencies: TDependencies
  ): FieldChainFactory<TOutput, TInput, TDependencies> {
    return this.clone({ dependencies }) as any
  }

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

  // TODO: Implement load
  // public load<TParent extends GraphQLSilk>(
  //   resolve: (
  //     parents: (TDependencies extends string[]
  //       ? RequireKeys<
  //           NonNullable<StandardSchemaV1.InferOutput<TParent>>,
  //           TDependencies[number]
  //         >
  //       : NonNullable<StandardSchemaV1.InferOutput<TParent>>)[],
  //     input: InferInputO<TInput>
  //   ) => MayPromise<NonNullable<StandardSchemaV1.InferOutput<TOutput>>[]>
  // ): Loom.Field<TParent, TOutput, TInput, TDependencies> {
  //   if (!this.options?.output) throw new Error("Output is required")

  //   const useUnifiedParseInput = createMemoization<{
  //     current?: CallableInputParser<TInput>
  //   }>(() => ({ current: undefined }))

  //   const useUserLoader = createMemoization(
  //     () =>
  //       new EasyDataLoader(
  //         async (parents: StandardSchemaV1.InferOutput<TParent>[]) =>
  //           resolve(
  //             parents,
  //             (await useUnifiedParseInput().current?.getResult()) as InferInputO<TInput>
  //           )
  //       )
  //   )

  //   const operation = "field"
  //   return meta({
  //     ...getFieldOptions(this.options, {
  //       [DERIVED_DEPENDENCIES]: this.options.dependencies,
  //     }),
  //     operation,
  //     input: this.options.input as TInput,
  //     output: this.options.output as TOutput,
  //     resolve: async (
  //       parent,
  //       inputValue
  //     ): Promise<StandardSchemaV1.InferOutput<TOutput>> => {
  //       const unifiedParseInput = useUnifiedParseInput()
  //       unifiedParseInput.current ??= createInputParser(
  //         this.options?.input as TInput,
  //         inputValue
  //       ) as CallableInputParser<TInput>
  //       return useUserLoader().load(parent)
  //     },
  //   }) as Loom.Field<TParent, TOutput, TInput, TDependencies>
  // }
}

export class QueryChainFactory<
    TOutput extends GraphQLSilk = never,
    TInput extends GraphQLSilk | Record<string, GraphQLSilk> | void = void,
  >
  extends BaseChainFactory<Loom.Query<TOutput, TInput>>
  implements IChainFactory<TOutput, TInput>
{
  public static methods() {
    return {
      ...BaseChainFactory.methods(),
      output: QueryChainFactory.prototype.output,
      input: QueryChainFactory.prototype.input,
      resolve: QueryChainFactory.prototype.resolve,
      clone: QueryChainFactory.prototype.clone,
    } as any as QueryChainFactory<never, void>
  }

  protected clone(options?: Partial<ChainFactoryOptions>): this {
    return new QueryChainFactory({ ...this.options, ...options }) as this
  }

  public output<TOutputNew extends GraphQLSilk>(
    output: TOutputNew
  ): QueryChainFactory<TOutputNew, TInput> {
    return new QueryChainFactory({ ...this.options, output })
  }

  public input<TInputNew extends GraphQLSilk | Record<string, GraphQLSilk>>(
    input: TInputNew
  ): QueryChainFactory<TOutput, TInputNew> {
    return new QueryChainFactory({ ...this.options, input })
  }

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
  public static methods() {
    return {
      ...BaseChainFactory.methods(),
      output: MutationChainFactory.prototype.output,
      input: MutationChainFactory.prototype.input,
      resolve: MutationChainFactory.prototype.resolve,
      clone: MutationChainFactory.prototype.clone,
    } as any as MutationChainFactory<never, undefined>
  }

  protected clone(options?: Partial<ChainFactoryOptions>): this {
    return new MutationChainFactory({ ...this.options, ...options }) as this
  }

  public output<TOutputNew extends GraphQLSilk>(
    output: TOutputNew
  ): MutationChainFactory<TOutputNew, TInput> {
    return new MutationChainFactory({ ...this.options, output })
  }

  public input<TInputNew extends GraphQLSilk | Record<string, GraphQLSilk>>(
    input: TInputNew
  ): MutationChainFactory<TOutput, TInputNew> {
    return new MutationChainFactory({ ...this.options, input })
  }

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
  public static methods() {
    return {
      ...BaseChainFactory.methods(),
      output: SubscriptionChainFactory.prototype.output,
      input: SubscriptionChainFactory.prototype.input,
      subscribe: SubscriptionChainFactory.prototype.subscribe,
      clone: SubscriptionChainFactory.prototype.clone,
    } as any as SubscriptionChainFactory<never, undefined>
  }

  protected clone(options?: Partial<ChainFactoryOptions>): this {
    return new SubscriptionChainFactory({ ...this.options, ...options }) as this
  }

  public output<TOutputNew extends GraphQLSilk>(
    output: TOutputNew
  ): SubscriptionChainFactory<TOutputNew, TInput> {
    return new SubscriptionChainFactory({ ...this.options, output })
  }

  public input<TInputNew extends GraphQLSilk | Record<string, GraphQLSilk>>(
    input: TInputNew
  ): SubscriptionChainFactory<TOutput, TInputNew> {
    return new SubscriptionChainFactory({ ...this.options, input })
  }

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
 * A subscription that can be resolved.
 */
export interface ResolvableSubscription<
  TOutput extends GraphQLSilk,
  TInput extends
    | GraphQLSilk
    | Record<string, GraphQLSilk>
    | undefined = undefined,
  TValue = StandardSchemaV1.InferOutput<TOutput>,
> extends Loom.Subscription<TOutput, TInput, TValue> {
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
 */
export interface SubscriptionNeedResolve<
  TOutput extends GraphQLSilk,
  TInput extends
    | GraphQLSilk
    | Record<string, GraphQLSilk>
    | undefined = undefined,
  TValue = StandardSchemaV1.InferOutput<TOutput>,
> {
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
    return loom.query(this.output, this.options)["~meta"]
  }

  public constructor(
    protected output: TOutput,
    protected readonly options: QueryOptions<TOutput, TInput>
  ) {
    super(options)
  }

  protected clone(options?: Partial<typeof this.options> | undefined): this {
    return new QueryFactoryWithResolve(this.output, {
      ...this.options,
      ...options,
    }) as this
  }

  public input<TInputNew extends GraphQLSilk<TInputO>>(
    input: TInputNew
  ): QueryFactoryWithResolve<TInputO, TOutput, TInputNew> {
    return new QueryFactoryWithResolve(this.output, {
      ...this.options,
      input,
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
    return loom.mutation(this.output, this.options)["~meta"]
  }

  public constructor(
    protected output: TOutput,
    protected readonly options: MutationOptions<TOutput, TInput>
  ) {
    super(options)
  }

  protected clone(options?: Partial<typeof this.options> | undefined): this {
    return new MutationFactoryWithResolve(this.output, {
      ...this.options,
      ...options,
    }) as this
  }

  public input<TInputNew extends GraphQLSilk<TInputO>>(
    input: TInputNew
  ): MutationFactoryWithResolve<TInputO, TOutput, TInputNew> {
    return new MutationFactoryWithResolve(this.output, {
      ...this.options,
      input,
    } as MutationOptions<any, any>)
  }
}

export class FieldFactoryWithResolve<
  TParent extends GraphQLSilk,
  TOutput extends GraphQLSilk,
> extends BaseChainFactory<Loom.Field<TParent, TOutput, undefined, undefined>> {
  public get "~meta"(): Loom.Field<
    TParent,
    TOutput,
    undefined,
    undefined
  >["~meta"] {
    return loom.field(this.output, this.options)["~meta"]
  }

  public constructor(
    protected output: TOutput,
    protected readonly options: FieldOptions<
      TParent,
      TOutput,
      undefined,
      undefined
    >
  ) {
    super(options)
  }

  protected clone(options?: Partial<typeof this.options> | undefined): this {
    return new FieldFactoryWithResolve(this.output, {
      ...this.options,
      ...options,
    }) as this
  }
}
