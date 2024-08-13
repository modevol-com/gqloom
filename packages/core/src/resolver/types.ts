import type {
  InferPropertyType,
  MayPromise,
  Middleware,
  ValueOf,
} from "../utils"
import type {
  InferInputI,
  InferInputO,
  InputSchema,
  InputSchemaToSilk,
} from "./input"
import type {
  GraphQLFieldConfig,
  GraphQLObjectTypeConfig,
  GraphQLOutputType,
} from "graphql"
import { type PARSE, type GET_GRAPHQL_TYPE } from "../utils/symbols"

/*
 * GraphQLSilk is the base unit for creating GraphQL resolvers.
 */
export interface GraphQLSilk<TOutput = any, TInput = any> {
  /**
   * GraphQL type for schema
   */
  [GET_GRAPHQL_TYPE]: () => GraphQLOutputType

  /**
   * validate and transform input to output
   */
  [PARSE]?: (input: TInput) => MayPromise<TOutput>

  /**
   * Input and output type.
   *
   * @internal
   */
  readonly "~types"?: { readonly input: TInput; readonly output: TOutput }
}

export type AbstractSchemaIO = [
  baseSchema: object,
  inputPath: string,
  outputPath: string,
]

export type GraphQLSilkIO = [
  object: GraphQLSilk,
  input: "~types.input",
  output: "~types.output",
]

export type InferSilkI<T extends GraphQLSilk> = NonNullable<
  T["~types"]
>["input"]

export type InferSilkO<T extends GraphQLSilk> = NonNullable<
  T["~types"]
>["output"]

export type InferSchemaI<
  TSchema,
  TSchemaIO extends AbstractSchemaIO,
> = InferPropertyType<TSchema, TSchemaIO[1]>

export type InferSchemaO<
  TSchema,
  TSchemaIO extends AbstractSchemaIO,
> = InferPropertyType<TSchema, TSchemaIO[2]>

export type SchemaToSilk<
  TSchemaIO extends AbstractSchemaIO,
  TSchema extends TSchemaIO[0],
> = GraphQLSilk<
  InferSchemaO<TSchema, TSchemaIO>,
  InferSchemaI<TSchema, TSchemaIO>
>

export interface ResolverOptions<
  TField extends GenericFieldOrOperation = GenericFieldOrOperation,
> {
  middlewares?: Middleware<TField>[]
}

export interface ResolverOptionsWithExtensions<
  TField extends GenericFieldOrOperation = GenericFieldOrOperation,
> extends ResolverOptions<TField>,
    Pick<GraphQLObjectTypeConfig<any, any>, "extensions"> {}

export interface ResolverOptionsWithParent<
  TField extends GenericFieldOrOperation = GenericFieldOrOperation,
> extends ResolverOptionsWithExtensions<TField> {
  parent?: TField extends FieldOrOperation<infer TParent, any, any, any>
    ? TParent
    : undefined
}

export interface ResolvingOptions
  extends Pick<ResolverOptions, "middlewares"> {}

export type OperationType = "query" | "mutation" | "subscription"

export type FieldOrOperationType = "field" | OperationType

export interface GraphQLFieldOptions
  extends Pick<
    GraphQLFieldConfig<any, any>,
    "description" | "deprecationReason" | "extensions"
  > {}

/**
 * Operation or Field for resolver.
 */
export interface FieldOrOperation<
  TParent extends undefined | GraphQLSilk,
  TOutput extends GraphQLSilk,
  TInput extends InputSchema<GraphQLSilk> | undefined = undefined,
  TType extends FieldOrOperationType = FieldOrOperationType,
> extends GraphQLFieldOptions {
  type: TType
  input: TInput
  output: TOutput
  resolve: TType extends "field"
    ? (
        parent: InferSilkO<NonNullable<TParent>>,
        input: InferInputI<TInput, GraphQLSilkIO>,
        options?: ResolvingOptions
      ) => Promise<InferSilkO<TOutput>>
    : TType extends "subscription"
      ? (
          value: any,
          input: InferInputI<TInput, GraphQLSilkIO>
        ) => Promise<InferSilkO<TOutput>>
      : (
          input: InferInputI<TInput, GraphQLSilkIO>,
          options?: ResolvingOptions
        ) => Promise<InferSilkO<TOutput>>

  subscribe?: TType extends "subscription"
    ? (
        input: InferInputI<TInput, GraphQLSilkIO>,
        options?: ResolvingOptions
      ) => MayPromise<AsyncIterator<any>>
    : undefined
}

export type GenericFieldOrOperation = FieldOrOperation<any, any, any, any>

export type InferFieldParent<TField extends GenericFieldOrOperation> =
  TField extends FieldOrOperation<infer TParent, any, any, any>
    ? TParent
    : never

export type InferFieldInput<TField extends GenericFieldOrOperation> =
  TField extends FieldOrOperation<any, any, infer TInput, any> ? TInput : never

export type InferFieldOutput<TField extends GenericFieldOrOperation> =
  TField extends FieldOrOperation<any, infer TOutput, any, any>
    ? TOutput
    : never

/**
 * Options for creating a GraphQL Query or Mutation.
 */
export interface QueryMutationOptions<
  TSchemaIO extends AbstractSchemaIO,
  TOutput extends TSchemaIO[0],
  TInput extends InputSchema<TSchemaIO[0]> = undefined,
> extends ResolverOptions<
      FieldOrOperation<
        undefined,
        SchemaToSilk<TSchemaIO, TOutput>,
        InputSchemaToSilk<TSchemaIO, TInput>,
        "query" | "mutation"
      >
    >,
    GraphQLFieldOptions {
  input?: TInput
  resolve: (
    input: InferInputO<TInput, TSchemaIO>
  ) => MayPromise<InferSchemaO<TOutput, TSchemaIO>>
}

/**
 * Function to create a GraphQL query or mutation.
 */
export interface QueryMutationBobbin<TSchemaIO extends AbstractSchemaIO> {
  <
    TOutput extends TSchemaIO[0],
    TInput extends InputSchema<TSchemaIO[0]> = undefined,
  >(
    output: TOutput,
    resolveOrOptions:
      | (() => MayPromise<InferSchemaO<TOutput, TSchemaIO>>)
      | QueryMutationOptions<TSchemaIO, TOutput, TInput>
  ): FieldOrOperation<
    undefined,
    SchemaToSilk<TSchemaIO, TOutput>,
    InputSchemaToSilk<TSchemaIO, TInput>,
    "query" | "mutation"
  >
}

/**
 * Options for External Filed of existing GraphQL Object.
 */
export interface FieldOptions<
  TSchemaIO extends AbstractSchemaIO,
  TParent extends TSchemaIO[0],
  TOutput extends TSchemaIO[0],
  TInput extends InputSchema<TSchemaIO[0]> = undefined,
> extends ResolverOptions<
      FieldOrOperation<
        SchemaToSilk<TSchemaIO, TParent>,
        SchemaToSilk<TSchemaIO, TOutput>,
        InputSchemaToSilk<TSchemaIO, TInput>,
        "field"
      >
    >,
    GraphQLFieldOptions {
  input?: TInput
  resolve: (
    parent: InferSchemaO<TParent, TSchemaIO>,
    input: InferInputO<TInput, TSchemaIO>
  ) => MayPromise<InferSchemaO<TOutput, TSchemaIO>>
}

/**
 * Function to create a GraphQL Field.
 */
export interface FieldBobbin<TSchemaIO extends AbstractSchemaIO> {
  <
    TParent extends TSchemaIO[0],
    TOutput extends TSchemaIO[0],
    TInput extends InputSchema<TSchemaIO[0]> = undefined,
  >(
    output: TOutput,
    resolveOrOptions:
      | ((
          parent: InferSchemaO<TParent, TSchemaIO>
        ) => MayPromise<InferSchemaO<TOutput, TSchemaIO>>)
      | FieldOptions<TSchemaIO, TParent, TOutput, TInput>
  ): FieldOrOperation<
    SchemaToSilk<TSchemaIO, TParent>,
    SchemaToSilk<TSchemaIO, TOutput>,
    InputSchemaToSilk<TSchemaIO, TInput>,
    "field"
  >
}

/**
 * Options for creating a GraphQL Subscription.
 */
export interface SubscriptionOptions<
  TSchemaIO extends AbstractSchemaIO,
  TOutput extends TSchemaIO[0],
  TInput extends InputSchema<TSchemaIO[0]> = undefined,
  TValue = InferSchemaO<TOutput, TSchemaIO>,
> extends ResolverOptions<
      Subscription<
        SchemaToSilk<TSchemaIO, TOutput>,
        InputSchemaToSilk<TSchemaIO, TInput>,
        TValue
      >
    >,
    GraphQLFieldOptions {
  input?: TInput
  subscribe: (
    input: InferInputO<TInput, TSchemaIO>
  ) => MayPromise<AsyncIterator<TValue>>
  resolve?: (
    value: TValue,
    input: InferInputO<TInput, TSchemaIO>
  ) => MayPromise<InferSchemaO<TOutput, TSchemaIO>>
}

export interface Subscription<
  TOutput extends GraphQLSilk,
  TInput extends InputSchema<GraphQLSilk> = undefined,
  TValue = InferSilkO<TOutput>,
> extends FieldOrOperation<undefined, TOutput, TInput, "subscription"> {
  resolve: (
    value: TValue,
    input: InferInputI<TInput, GraphQLSilkIO>
  ) => Promise<InferSilkO<TOutput>>
  subscribe: (
    input: InferInputI<TInput, GraphQLSilkIO>,
    options?: ResolvingOptions
  ) => MayPromise<AsyncIterator<TValue>>
}

/**
 * Function to create a GraphQL subscription.
 */
export interface SubscriptionBobbin<TSchemaIO extends AbstractSchemaIO> {
  <
    TOutput extends TSchemaIO[0],
    TInput extends InputSchema<TSchemaIO[0]> = undefined,
    TValue = InferSchemaO<TOutput, TSchemaIO>,
  >(
    output: TOutput,
    subscribeOrOptions:
      | (() => MayPromise<AsyncIterator<InferSchemaO<TOutput, TSchemaIO>>>)
      | SubscriptionOptions<TSchemaIO, TOutput, TInput, TValue>
  ): Subscription<
    SchemaToSilk<TSchemaIO, TOutput>,
    InputSchemaToSilk<TSchemaIO, TInput>,
    TValue
  >
}

export interface ResolverBobbin<TSchemaIO extends AbstractSchemaIO> {
  of<
    TParent extends TSchemaIO[0],
    TOperations extends Record<
      string,
      | FieldOrOperation<SchemaToSilk<TSchemaIO, TParent>, any, any>
      | FieldOrOperation<undefined, any, any, OperationType>
    >,
  >(
    parent: TParent,
    operationOrFields: TOperations,
    options?: ResolverOptionsWithExtensions<ValueOf<TOperations>>
  ): TOperations

  <
    TOperations extends Record<
      string,
      FieldOrOperation<undefined, any, any, OperationType>
    >,
  >(
    operations: TOperations,
    options?: ResolverOptions<ValueOf<TOperations>>
  ): TOperations
}
