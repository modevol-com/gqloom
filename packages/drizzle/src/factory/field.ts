import {
  BaseChainFactory,
  type FieldOptions,
  type GraphQLSilk,
  type Loom,
  type MutationOptions,
  type QueryOptions,
  loom,
} from "@gqloom/core"

export class QueryFactoryWithResolve<
    TInputO,
    TOutput extends GraphQLSilk,
    TInput extends GraphQLSilk<TInputO>,
  >
  extends BaseChainFactory<Loom.Query<TOutput, TInput>>
  implements Loom.Query<TOutput, TInput>
{
  public get "~meta"(): Loom.Query<TOutput, TInput>["~meta"] {
    return loom.query(this.output, this.options as QueryOptions<any, any>)[
      "~meta"
    ]
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
    return loom.mutation(
      this.output,
      this.options as MutationOptions<any, any>
    )["~meta"]
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
> extends BaseChainFactory<Loom.Field<TParent, TOutput, undefined>> {
  public get "~meta"(): Loom.Field<TParent, TOutput, undefined>["~meta"] {
    return loom.field(this.output, this.options as FieldOptions<any, any, any>)[
      "~meta"
    ]
  }

  public constructor(
    protected output: TOutput,
    protected readonly options: FieldOptions<TParent, TOutput, undefined>
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
