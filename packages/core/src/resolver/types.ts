import type { InferPropertyType, MayPromise, Middleware } from "../utils"
import type { RESOLVER_OPTIONS_KEY } from "./resolver"
import type {
  InferInputI,
  InferInputO,
  InputSchema,
  InputSchemaToSilk,
} from "./input"
import type { GraphQLFieldConfig, GraphQLOutputType } from "graphql"

/*
 * GraphQLSilk is the base unit for creating GraphQL resolvers.
 */
export interface GraphQLSilk<TOutput, TInput> extends GraphQLFieldOptions {
  /**
   * GraphQL type for schema
   */
  getType(options: Record<string | symbol | number, any>): GraphQLOutputType

  /**
   * validate and transform input to output
   */
  parse?: (input: TInput) => MayPromise<TOutput>

  /**
   * Input and output type.
   *
   * @internal
   */
  _types?: { input: TInput; output: TOutput }
}

export type AnyGraphQLSilk = GraphQLSilk<any, any>

export type AbstractSchemaIO = [
  baseSchema: object,
  inputPath: string,
  output: string,
]

export type GraphQLSilkIO = [
  object: AnyGraphQLSilk,
  input: "_types.input",
  output: "_types.output",
]

export type InferSilkI<T extends AnyGraphQLSilk> = NonNullable<
  T["_types"]
>["input"]

export type InferSilkO<T extends AnyGraphQLSilk> = NonNullable<
  T["_types"]
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

export interface ResolverOptions {
  middlewares?: Middleware[]
}

export interface ResolverOptionsWithParent<
  T extends AnyGraphQLSilk = AnyGraphQLSilk,
> extends ResolverOptions {
  parent?: T
}

export interface ResolvingOptions extends Pick<ResolverOptions, "middlewares"> {
  //TODO: applyMiddlewares
}

export type OperationType = "query" | "mutation" | "subscription"

export type OperationOrFieldType = OperationType | "field"

export type GraphQLFieldOptions = Pick<
  GraphQLFieldConfig<any, any>,
  "description" | "deprecationReason" | "extensions"
>

/**
 * Operation or Field for resolver.
 */
export interface OperationOrField<
  TParent extends AnyGraphQLSilk,
  TOutput extends AnyGraphQLSilk,
  TInput extends InputSchema<AnyGraphQLSilk> = undefined,
  TType extends OperationOrFieldType = OperationOrFieldType,
> extends GraphQLFieldOptions {
  type: TType
  input: TInput
  output: TOutput
  resolve: TType extends "field"
    ? (
        parent: InferSilkO<TParent>,
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

/**
 * Options for creating a GraphQL Query or Mutation.
 */
export interface QueryMutationOptions<
  TSchemaIO extends AbstractSchemaIO,
  TOutput extends TSchemaIO[0],
  TInput extends InputSchema<TSchemaIO[0]> = undefined,
> extends ResolverOptions,
    GraphQLFieldOptions {
  input?: TInput
  resolve: (
    input: InferInputO<TInput, TSchemaIO>
  ) => MayPromise<InferSchemaO<TOutput, TSchemaIO>>
}

export interface QueryMutationShuttle<TSchemaIO extends AbstractSchemaIO> {
  <
    TOutput extends TSchemaIO[0],
    TInput extends InputSchema<TSchemaIO[0]> = undefined,
  >(
    output: TOutput,
    resolveOrOptions:
      | (() => MayPromise<InferSchemaO<TOutput, TSchemaIO>>)
      | QueryMutationOptions<TSchemaIO, TOutput, TInput>
  ): OperationOrField<
    any,
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
  TOutput,
  TInput extends InputSchema<TSchemaIO[0]> = undefined,
> extends ResolverOptions,
    GraphQLFieldOptions {
  input?: TInput
  resolve: (
    parent: InferSchemaO<TParent, TSchemaIO>,
    input: InferInputO<TInput, TSchemaIO>
  ) => MayPromise<InferSchemaO<TOutput, TSchemaIO>>
}

export interface FieldShuttle<TSchemaIO extends AbstractSchemaIO> {
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
  ): OperationOrField<
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
> extends ResolverOptions,
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
  TOutput extends AnyGraphQLSilk,
  TInput extends InputSchema<AnyGraphQLSilk> = undefined,
  TValue = InferSilkO<TOutput>,
> extends OperationOrField<any, TOutput, TInput, "subscription"> {
  resolve: (
    value: TValue,
    input: InferInputI<TInput, GraphQLSilkIO>
  ) => Promise<InferSilkO<TOutput>>
  subscribe: (
    input: InferInputI<TInput, GraphQLSilkIO>,
    options?: ResolvingOptions
  ) => MayPromise<AsyncIterator<TValue>>
}

export interface SubscriptionShuttle<TSchemaIO extends AbstractSchemaIO> {
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

export interface ResolverShuttle<TSchemaIO extends AbstractSchemaIO> {
  of<
    TParent extends TSchemaIO[0],
    TOperations extends Record<
      string,
      OperationOrField<SchemaToSilk<TSchemaIO, TParent>, any, any>
    >,
  >(
    parent: TParent,
    operationOrFields: TOperations,
    options?: ResolverOptions
  ): TOperations & {
    [RESOLVER_OPTIONS_KEY]: ResolverOptionsWithParent<
      SchemaToSilk<TSchemaIO, TParent>
    >
  }

  <
    TOperations extends Record<
      string,
      OperationOrField<any, any, any, OperationType>
    >,
  >(
    operations: TOperations,
    options?: ResolverOptions
  ): TOperations & {
    [RESOLVER_OPTIONS_KEY]?: ResolverOptions
  }
}
