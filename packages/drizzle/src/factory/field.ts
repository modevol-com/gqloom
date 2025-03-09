import {
  BaseChainFactory,
  type GraphQLSilk,
  type Loom,
  type ResolvingOptions,
} from "@gqloom/core"

export class ChainFactoryWithResolve<
    TOutput extends GraphQLSilk,
    TInput extends
      | GraphQLSilk
      | Record<string, GraphQLSilk>
      | undefined = undefined,
  >
  extends BaseChainFactory
  implements Loom.Query<TOutput, TInput>
{
  public get "~meta"() {
    return this.options
  }

  public constructor(
    protected readonly options: Loom.Query<TOutput, TInput>["~meta"] &
      ResolvingOptions
  ) {
    super()
  }

  protected clone(options?: Partial<typeof this.options> | undefined): this {
    return new ChainFactoryWithResolve({ ...this.options, ...options }) as this
  }
}
