import type { StandardSchemaV1 } from "@standard-schema/spec"
import type { MayPromise, Middleware } from "../utils"
import type { InferInputO } from "./input"
import {
  createField,
  createMutation,
  createQuery,
  createSubscription,
} from "./resolver"
import type {
  EnsureSilk,
  FieldOrOperation,
  GraphQLFieldOptions,
  GraphQLSilk,
  Subscription,
} from "./types"

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

abstract class BaseChainFactory {
  static methods() {
    return {
      description: BaseChainFactory.prototype.description,
      deprecationReason: BaseChainFactory.prototype.deprecationReason,
      extensions: BaseChainFactory.prototype.extensions,
    }
  }

  constructor(
    protected readonly options?: Partial<
      FieldOrOperation<any, any, any, any> & { middlewares: Middleware[] }
    >
  ) {}

  protected abstract clone(
    options?: Partial<
      FieldOrOperation<any, any, any, any> & { middlewares: Middleware[] }
    >
  ): this

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

  protected clone(
    options?: Partial<FieldOrOperation<any, any, any, any>>
  ): this {
    return new FieldChainFactory({ ...this.options, ...options }) as this
  }

  public use(
    ...middlewares: Middleware<
      FieldOrOperation<any, TOutput, TInput, "field">
    >[]
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
  ): FieldOrOperation<EnsureSilk<TParent>, TOutput, TInput, "field"> {
    return createField(this.options?.output, {
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

  protected clone(
    options?: Partial<FieldOrOperation<any, any, any, any>>
  ): this {
    return new QueryChainFactory({ ...this.options, ...options }) as this
  }

  public use(
    ...middlewares: Middleware<
      FieldOrOperation<any, TOutput, TInput, "query">
    >[]
  ): this {
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
  ): FieldOrOperation<undefined, TOutput, TInput, "query"> {
    return createQuery(this.options?.output, {
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

  protected clone(
    options?: Partial<FieldOrOperation<any, any, any, any>>
  ): this {
    return new MutationChainFactory({ ...this.options, ...options }) as this
  }

  public use(
    ...middlewares: Middleware<
      FieldOrOperation<any, TOutput, TInput, "mutation">
    >[]
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
  ): FieldOrOperation<any, TOutput, TInput, "mutation"> {
    return createMutation(this.options?.output, {
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

  protected clone(
    options?: Partial<FieldOrOperation<any, any, any, any>>
  ): this {
    return new SubscriptionChainFactory({ ...this.options, ...options }) as this
  }

  public use(
    ...middlewares: Middleware<
      FieldOrOperation<any, TOutput, TInput, "subscription">
    >[]
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
    const subscription = createSubscription(options?.output, {
      ...options,
      subscribe,
    }) as Subscription<any, any, any>

    const subscriptionResolve = subscription.resolve

    const resolve = (...args: any[]) => {
      if (args.length === 1 && typeof args[0] === "function") {
        return createSubscription(options?.output, {
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
> extends Subscription<TOutput, TInput, TValue> {
  resolve(
    resolve: (
      value: TValue,
      input: InferInputO<TInput>
    ) => MayPromise<StandardSchemaV1.InferOutput<TOutput>>
  ): Subscription<TOutput, TInput, TValue>

  resolve(value: TValue, input: any): MayPromise<any>
}
