import type { MayPromise } from "../utils"
import type { InferInputO, InputSchema, InputSchemaToSilk } from "./input"
import type {
  AbstractSchemaIO,
  FieldOrOperation,
  GraphQLFieldOptions,
  InferSchemaO,
  SchemaToSilk,
} from "./types"

export interface IChainFactory<
  TSchemaIO extends AbstractSchemaIO,
  TOutput extends TSchemaIO[0],
  TInput extends InputSchema<TSchemaIO[0]> = undefined,
> {
  description(description: GraphQLFieldOptions["description"]): this

  deprecationReason(
    deprecationReason: GraphQLFieldOptions["deprecationReason"]
  ): this

  extensions(extensions: GraphQLFieldOptions["extensions"]): this

  output<TOutputNew extends TSchemaIO[0]>(
    output: TOutputNew
  ): IChainFactory<TSchemaIO, TOutputNew, TInput>

  input<TInputNew extends InputSchema<TSchemaIO[0]>>(
    input: TInputNew
  ): IChainFactory<TSchemaIO, TOutput, TInputNew>
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
    protected readonly options?: Partial<FieldOrOperation<any, any, any, any>>
  ) {}

  protected abstract clone(
    options?: Partial<FieldOrOperation<any, any, any, any>>
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
}

export class FieldChainFactory<
    TSchemaIO extends AbstractSchemaIO,
    TOutput extends TSchemaIO[0] = never,
    TInput extends InputSchema<TSchemaIO[0]> = undefined,
  >
  extends BaseChainFactory
  implements IChainFactory<TSchemaIO, TOutput, TInput>
{
  static methods() {
    return {
      ...BaseChainFactory.methods(),
      output: FieldChainFactory.prototype.output,
      input: FieldChainFactory.prototype.input,
      resolve: FieldChainFactory.prototype.resolve,
      clone: FieldChainFactory.prototype.clone,
    } as any as FieldChainFactory<any, never, undefined>
  }

  protected clone(
    options?: Partial<FieldOrOperation<any, any, any, any>>
  ): this {
    return new FieldChainFactory({ ...this.options, ...options }) as this
  }

  public output<TOutputNew extends TSchemaIO[0]>(
    output: TOutputNew
  ): FieldChainFactory<TSchemaIO, TOutputNew, TInput> {
    return new FieldChainFactory({ ...this.options, output })
  }

  public input<TInputNew extends InputSchema<TSchemaIO[0]>>(
    input: TInputNew
  ): FieldChainFactory<TSchemaIO, TOutput, TInputNew> {
    return new FieldChainFactory({ ...this.options, input })
  }

  public resolve<TParent extends TSchemaIO[0]>(
    resolve: (
      parent: InferSchemaO<TParent, TSchemaIO>,
      input: InferInputO<TInput, TSchemaIO>
    ) => MayPromise<InferSchemaO<TOutput, TSchemaIO>>
  ): FieldOrOperation<
    SchemaToSilk<TSchemaIO, TParent>,
    SchemaToSilk<TSchemaIO, TOutput>,
    InputSchemaToSilk<TSchemaIO, TInput>,
    "field"
  > {
    return {
      ...this.options,
      type: "field",
      resolve,
    } as any
  }
}

export class QueryChainFactory<
    TSchemaIO extends AbstractSchemaIO,
    TOutput extends TSchemaIO[0] = never,
    TInput extends InputSchema<TSchemaIO[0]> = undefined,
  >
  extends BaseChainFactory
  implements IChainFactory<TSchemaIO, TOutput, TInput>
{
  static methods() {
    return {
      ...BaseChainFactory.methods(),
      output: QueryChainFactory.prototype.output,
      input: QueryChainFactory.prototype.input,
      resolve: QueryChainFactory.prototype.resolve,
      clone: QueryChainFactory.prototype.clone,
    } as any as QueryChainFactory<any, never, undefined>
  }

  protected clone(
    options?: Partial<FieldOrOperation<any, any, any, any>>
  ): this {
    return new QueryChainFactory({ ...this.options, ...options }) as this
  }

  public output<TOutputNew extends TSchemaIO[0]>(
    output: TOutputNew
  ): QueryChainFactory<TSchemaIO, TOutputNew, TInput> {
    return new QueryChainFactory({ ...this.options, output })
  }

  public input<TInputNew extends InputSchema<TSchemaIO[0]>>(
    input: TInputNew
  ): QueryChainFactory<TSchemaIO, TOutput, TInputNew> {
    return new QueryChainFactory({ ...this.options, input })
  }

  public resolve(
    resolve: (
      input: InferInputO<TInput, TSchemaIO>
    ) => MayPromise<InferSchemaO<TOutput, TSchemaIO>>
  ) {
    return {
      ...this.options,
      type: "query",
      resolve,
    } as any
  }
}

export class MutationChainFactory<
    TSchemaIO extends AbstractSchemaIO,
    TOutput extends TSchemaIO[0] = never,
    TInput extends InputSchema<TSchemaIO[0]> = undefined,
  >
  extends BaseChainFactory
  implements IChainFactory<TSchemaIO, TOutput, TInput>
{
  static methods() {
    return {
      ...BaseChainFactory.methods(),
      output: MutationChainFactory.prototype.output,
      input: MutationChainFactory.prototype.input,
      resolve: MutationChainFactory.prototype.resolve,
      clone: MutationChainFactory.prototype.clone,
    } as any as MutationChainFactory<any, never, undefined>
  }

  protected clone(
    options?: Partial<FieldOrOperation<any, any, any, any>>
  ): this {
    return new MutationChainFactory({ ...this.options, ...options }) as this
  }

  public output<TOutputNew extends TSchemaIO[0]>(
    output: TOutputNew
  ): MutationChainFactory<TSchemaIO, TOutputNew, TInput> {
    return new MutationChainFactory({ ...this.options, output })
  }

  public input<TInputNew extends InputSchema<TSchemaIO[0]>>(
    input: TInputNew
  ): MutationChainFactory<TSchemaIO, TOutput, TInputNew> {
    return new MutationChainFactory({ ...this.options, input })
  }

  public resolve(
    resolve: (
      input: InferInputO<TInput, TSchemaIO>
    ) => MayPromise<InferSchemaO<TOutput, TSchemaIO>>
  ) {
    return {
      ...this.options,
      type: "mutation",
      resolve,
    } as any
  }
}
