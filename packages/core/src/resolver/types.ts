import type { InferPropertyType, MayPromise, Middleware } from "../utils"
import type { RESOLVER_OPTIONS_KEY } from "./resolver"
import type {
  InferInputI,
  InferInputO,
  InputSchema,
  InputSchemaToFabric,
} from "./input"
import type { GraphQLType } from "graphql"

/*
 * GraphQLFabric is the base unit for creating GraphQL resolvers.
 */
export interface GraphQLFabric<TOutput, TInput> {
  /**
   * GraphQL type for schema
   */
  type: GraphQLType

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

export type AnyGraphQLFabric = GraphQLFabric<any, any>

export type AbstractSchemaIO = [
  baseSchema: object,
  inputPath: string,
  output: string,
]

export type GraphQLFabricIO = [
  object: AnyGraphQLFabric,
  input: "_types.input",
  output: "_types.output",
]

export type InferFabricI<T extends AnyGraphQLFabric> = NonNullable<
  T["_types"]
>["input"]

export type InferFabricO<T extends AnyGraphQLFabric> = NonNullable<
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

export type SchemaToFabric<
  TSchemaIO extends AbstractSchemaIO,
  TSchema extends TSchemaIO[0],
> = GraphQLFabric<
  InferSchemaO<TSchema, TSchemaIO>,
  InferSchemaI<TSchema, TSchemaIO>
>

export interface ResolverOptions {
  middlewares?: Middleware[]
}

export interface ResolverOptionsWithParent<T> extends ResolverOptions {
  parent: T
}

export interface ResolvingOptions extends Pick<ResolverOptions, "middlewares"> {
  //TODO: applyMiddlewares
}

export type OperationType = "query" | "mutation" | "subscription"

export type OperationOrFieldType = OperationType | "field"

/**
 * Operation or Field for resolver.
 */
export interface OperationOrField<
  TParent extends AnyGraphQLFabric,
  TOutput extends AnyGraphQLFabric,
  TInput extends InputSchema<AnyGraphQLFabric> = undefined,
  TType extends OperationOrFieldType = OperationOrFieldType,
> {
  type: TType
  input: TInput
  output: TOutput
  resolve: TType extends "field"
    ? (
        parent: InferFabricO<TParent>,
        input: InferInputI<TInput, GraphQLFabricIO>,
        options?: ResolvingOptions
      ) => Promise<InferFabricO<TOutput>>
    : TType extends "subscription"
      ? (
          value: any,
          input: InferInputI<TInput, GraphQLFabricIO>
        ) => Promise<InferFabricO<TOutput>>
      : (
          input: InferInputI<TInput, GraphQLFabricIO>,
          options?: ResolvingOptions
        ) => Promise<InferFabricO<TOutput>>

  subscribe?: TType extends "subscription"
    ? (
        input: InferInputI<TInput, GraphQLFabricIO>,
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
> extends ResolverOptions {
  input?: TInput
  resolve: (
    input: InferInputO<TInput, TSchemaIO>
  ) => MayPromise<InferSchemaO<TOutput, TSchemaIO>>
}

export interface QueryMutationWeaver<TSchemaIO extends AbstractSchemaIO> {
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
    SchemaToFabric<TSchemaIO, TOutput>,
    InputSchemaToFabric<TSchemaIO, TInput>,
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
> extends ResolverOptions {
  input?: TInput
  resolve: (
    parent: InferSchemaO<TParent, TSchemaIO>,
    input: InferInputO<TInput, TSchemaIO>
  ) => MayPromise<InferSchemaO<TOutput, TSchemaIO>>
}

export interface FieldWeaver<TSchemaIO extends AbstractSchemaIO> {
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
    SchemaToFabric<TSchemaIO, TParent>,
    SchemaToFabric<TSchemaIO, TOutput>,
    InputSchemaToFabric<TSchemaIO, TInput>,
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
> extends ResolverOptions {
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
  TOutput extends AnyGraphQLFabric,
  TInput extends InputSchema<AnyGraphQLFabric> = undefined,
  TValue = InferFabricO<TOutput>,
> extends OperationOrField<any, TOutput, TInput, "subscription"> {
  resolve: (
    value: TValue,
    input: InferInputI<TInput, GraphQLFabricIO>
  ) => Promise<InferFabricO<TOutput>>
  subscribe: (
    input: InferInputI<TInput, GraphQLFabricIO>,
    options?: ResolvingOptions
  ) => MayPromise<AsyncIterator<TValue>>
}

export interface SubscriptionWeaver<TSchemaIO extends AbstractSchemaIO> {
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
    SchemaToFabric<TSchemaIO, TOutput>,
    InputSchemaToFabric<TSchemaIO, TInput>,
    TValue
  >
}

export interface ResolverWeaver<TSchemaIO extends AbstractSchemaIO> {
  of<
    TParent extends TSchemaIO[0],
    TOperations extends Record<
      string,
      OperationOrField<SchemaToFabric<TSchemaIO, TParent>, any, any>
    >,
  >(
    parent: TParent,
    operationOrFields: TOperations,
    options?: ResolverOptions
  ): TOperations & {
    [RESOLVER_OPTIONS_KEY]: ResolverOptionsWithParent<TParent>
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
