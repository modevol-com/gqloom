import type { StandardSchemaV1 } from "@standard-schema/spec"
import type { MayPromise, Middleware } from "../utils"
import type { InferInputO } from "./input"
import {
  createField,
  createMutation,
  createQuery,
  createSubscription,
} from "./resolver"
import type { GraphQLFieldOptions, GraphQLSilk, Loom } from "./types"

export interface IChainFactory<
  TOutput extends GraphQLSilk,
  TInput extends
    | GraphQLSilk
    | Record<string, GraphQLSilk>
    | undefined = undefined,
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

interface ChainFactoryOptions extends Loom.FieldMeta {
  middlewares?: Middleware[]
}

abstract class BaseChainFactory {
  static methods() {
    return {
      description: BaseChainFactory.prototype.description,
      deprecationReason: BaseChainFactory.prototype.deprecationReason,
      extensions: BaseChainFactory.prototype.extensions,
    }
  }

  constructor(protected readonly options?: Partial<ChainFactoryOptions>) {}

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

  public use(...middlewares: Middleware[]): this {
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
  >
  extends BaseChainFactory
  implements IChainFactory<TOutput, TInput>
{
  static methods() {
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

  public use(
    ...middlewares: Middleware<Loom.Field<any, TOutput, TInput>>[]
  ): this {
    return super.use(...middlewares)
  }

  public output<TOutputNew extends GraphQLSilk>(
    output: TOutputNew
  ): FieldChainFactory<TOutputNew, TInput> {
    return new FieldChainFactory({ ...this.options, output })
  }

  public input<TInputNew extends GraphQLSilk | Record<string, GraphQLSilk>>(
    input: TInputNew
  ): FieldChainFactory<TOutput, TInputNew> {
    return new FieldChainFactory({ ...this.options, input })
  }

  public resolve<TParent extends GraphQLSilk>(
    resolve: (
      parent: StandardSchemaV1.InferOutput<TParent>,
      input: InferInputO<TInput>
    ) => MayPromise<StandardSchemaV1.InferOutput<TOutput>>
  ): Loom.Field<TParent, TOutput, TInput> {
    if (!this.options?.output) throw new Error("Output is required")
    return createField(this.options.output, {
      ...this.options,
      resolve,
    }) as any
  }
}

export class QueryChainFactory<
    TOutput extends GraphQLSilk = never,
    TInput extends
      | GraphQLSilk
      | Record<string, GraphQLSilk>
      | undefined = undefined,
  >
  extends BaseChainFactory
  implements IChainFactory<TOutput, TInput>
{
  static methods() {
    return {
      ...BaseChainFactory.methods(),
      output: QueryChainFactory.prototype.output,
      input: QueryChainFactory.prototype.input,
      resolve: QueryChainFactory.prototype.resolve,
      clone: QueryChainFactory.prototype.clone,
    } as any as QueryChainFactory<never, undefined>
  }

  protected clone(options?: Partial<ChainFactoryOptions>): this {
    return new QueryChainFactory({ ...this.options, ...options }) as this
  }

  public use(...middlewares: Middleware<Loom.Query<TOutput, TInput>>[]): this {
    return super.use(...middlewares)
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
      input: InferInputO<TInput>
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
  extends BaseChainFactory
  implements IChainFactory<TOutput, TInput>
{
  static methods() {
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

  public use(
    ...middlewares: Middleware<Loom.Mutation<TOutput, TInput>>[]
  ): this {
    return super.use(...middlewares)
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
      input: InferInputO<TInput>
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
  extends BaseChainFactory
  implements IChainFactory<TOutput, TInput>
{
  static methods() {
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

  public use(
    ...middlewares: Middleware<Loom.Subscription<TOutput, TInput, any>>[]
  ): this {
    return super.use(...middlewares)
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
    subscribe: (input: InferInputO<TInput>) => MayPromise<AsyncIterator<TValue>>
  ): ResolvableSubscription<TOutput, TInput, TValue> {
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
      input: InferInputO<TInput>
    ) => MayPromise<StandardSchemaV1.InferOutput<TOutput>>
  ): Loom.Subscription<TOutput, TInput, TValue>
}
