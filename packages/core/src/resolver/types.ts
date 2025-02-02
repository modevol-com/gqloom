import type { StandardSchemaV1 } from "@standard-schema/spec"
import type {
  GraphQLFieldConfig,
  GraphQLObjectTypeConfig,
  GraphQLOutputType,
} from "graphql"
import type {
  InferPropertyType,
  MayPromise,
  Middleware,
  ValueOf,
} from "../utils"
import type { FIELD_HIDDEN, GET_GRAPHQL_TYPE } from "../utils/symbols"
import type {
  InferInputI,
  InferInputO,
  InputSchema,
  InputSchemaToSilk,
} from "./input"
import type {
  FieldChainFactory,
  MutationChainFactory,
  QueryChainFactory,
  SubscriptionChainFactory,
} from "./resolver-chain-factory"

/*
 * GraphQLSilk is the base unit for creating GraphQL resolvers.
 */
export interface GraphQLSilk<TOutput = any, TInput = any>
  extends StandardSchemaV1<TInput, TOutput> {
  /**
   * GraphQL type for schema
   */
  [GET_GRAPHQL_TYPE]?: () => GraphQLOutputType
}

export type AbstractSchemaIO = [
  baseSchema: object,
  inputPath: string,
  outputPath: string,
]

export type GraphQLSilkIO = [
  object: GraphQLSilk,
  input: "~standard.types.input",
  output: "~standard.types.output",
]

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
        parent: StandardSchemaV1.InferOutput<NonNullable<TParent>>,
        input: InferInputI<TInput, GraphQLSilkIO>,
        options?: ResolvingOptions
      ) => Promise<StandardSchemaV1.InferOutput<TOutput>>
    : TType extends "subscription"
      ? (
          value: any,
          input: InferInputI<TInput, GraphQLSilkIO>
        ) => Promise<StandardSchemaV1.InferOutput<TOutput>>
      : (
          input: InferInputI<TInput, GraphQLSilkIO>,
          options?: ResolvingOptions
        ) => Promise<StandardSchemaV1.InferOutput<TOutput>>

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
 * Function to create a GraphQL query.
 */
export interface QueryFactory<TSchemaIO extends AbstractSchemaIO> {
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
    "query"
  >
}

export interface QueryFactoryWithChain<TSchemaIO extends AbstractSchemaIO>
  extends QueryFactory<TSchemaIO>,
    QueryChainFactory<TSchemaIO, never, undefined> {}

/**
 * Function to create a GraphQL mutation.
 */
export interface MutationFactory<TSchemaIO extends AbstractSchemaIO> {
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
    "mutation"
  >
}

/**
 * Function to create a GraphQL mutation.
 */
export interface MutationFactoryWithChain<TSchemaIO extends AbstractSchemaIO>
  extends MutationFactory<TSchemaIO>,
    MutationChainFactory<TSchemaIO, never, undefined> {}

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
export interface FieldFactory<TSchemaIO extends AbstractSchemaIO> {
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

export interface FieldFactoryWithUtils<TSchemaIO extends AbstractSchemaIO>
  extends FieldFactory<TSchemaIO>,
    FieldChainFactory<TSchemaIO, never, undefined> {
  /** Set fields to be hidden in GraphQL Schema */
  hidden: typeof FIELD_HIDDEN
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
  TValue = StandardSchemaV1.InferOutput<TOutput>,
> extends FieldOrOperation<undefined, TOutput, TInput, "subscription"> {
  resolve: (
    value: TValue,
    input: InferInputI<TInput, GraphQLSilkIO>
  ) => Promise<StandardSchemaV1.InferOutput<TOutput>>
  subscribe: (
    input: InferInputI<TInput, GraphQLSilkIO>,
    options?: ResolvingOptions
  ) => MayPromise<AsyncIterator<TValue>>
}

/**
 * Function to create a GraphQL subscription.
 */
export interface SubscriptionFactory<TSchemaIO extends AbstractSchemaIO> {
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

export interface SubscriptionFactoryWithChain<
  TSchemaIO extends AbstractSchemaIO,
> extends SubscriptionFactory<TSchemaIO>,
    SubscriptionChainFactory<TSchemaIO, never, undefined> {}

export interface ResolverFactory<TSchemaIO extends AbstractSchemaIO> {
  of<
    TParent extends TSchemaIO[0],
    TOperations extends Record<
      string,
      | FieldOrOperation<SchemaToSilk<TSchemaIO, TParent>, any, any>
      | FieldOrOperation<undefined, any, any, OperationType>
      | typeof FIELD_HIDDEN
    >,
  >(
    parent: TParent,
    operationOrFields: TOperations,
    options?: ResolverOptionsWithExtensions<
      OmitInUnion<ValueOf<TOperations>, typeof FIELD_HIDDEN>
    >
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

type OmitInUnion<TUnion, TOmit> = TUnion extends infer T
  ? T extends TOmit
    ? never
    : T
  : never
