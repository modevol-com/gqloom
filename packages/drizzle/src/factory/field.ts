import {
  BaseChainFactory,
  type GraphQLSilk,
  type Loom,
  type QueryOptions,
  loom,
} from "@gqloom/core"

export class QueryFactoryWithResolve<
    TInputO,
    TOutput extends GraphQLSilk,
    TInput extends GraphQLSilk<TInputO>,
  >
  extends BaseChainFactory
  implements Loom.Query<TOutput, TInput>
{
  public get "~meta"(): Loom.Query<TOutput, TInput>["~meta"] {
    return loom.query(this.output, this.options as QueryOptions<any, any>)[
      "~meta"
    ]
  }

  public constructor(
    protected output: GraphQLSilk,
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
