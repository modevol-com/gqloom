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

export interface ResolvingOptions
  extends Pick<ResolverOptions, "middlewares"> {}

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
    : (
        input: InferInputI<TInput, GraphQLFabricIO>,
        options?: ResolvingOptions
      ) => Promise<InferFabricO<TOutput>>
}

/**
 * Operation for resolver.
 */
export interface Operation<
  TOutput extends AnyGraphQLFabric,
  TInput extends InputSchema<AnyGraphQLFabric> = undefined,
> extends OperationOrField<
    any,
    TOutput,
    TInput,
    "query" | "mutation" | "subscription"
  > {}

/**
 * Field for resolver.
 */
export interface Field<
  TParent extends AnyGraphQLFabric,
  TOutput extends AnyGraphQLFabric,
  TInput extends InputSchema<AnyGraphQLFabric> = undefined,
> extends OperationOrField<TParent, TOutput, TInput, "field"> {}

/**
 * Options for creating a GraphQL operation.
 */
export interface OperationOptions<
  TSchemaIO extends AbstractSchemaIO,
  TOutput extends TSchemaIO[0],
  TInput extends InputSchema<TSchemaIO[0]> = undefined,
> extends ResolverOptions {
  input?: TInput
  resolve: (
    input: InferInputO<TInput, TSchemaIO>
  ) => MayPromise<InferSchemaO<TOutput, TSchemaIO>>
}

export interface OperationWeaver<TSchemaIO extends AbstractSchemaIO> {
  <
    TOutput extends TSchemaIO[0],
    TInput extends InputSchema<TSchemaIO[0]> = undefined,
  >(
    output: TOutput,
    resolveOrOptions:
      | (() => MayPromise<InferSchemaO<TOutput, TSchemaIO>>)
      | OperationOptions<TSchemaIO, TOutput, TInput>
  ): OperationOrField<
    any,
    SchemaToFabric<TSchemaIO, TOutput>,
    InputSchemaToFabric<TSchemaIO, TInput>,
    OperationType
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
