import type { StandardSchemaV1 } from "@standard-schema/spec"
import type {
  GraphQLFieldConfig,
  GraphQLObjectTypeConfig,
  GraphQLOutputType,
} from "graphql"
import type { MayPromise, Middleware, ValueOf } from "../utils"
import type { FIELD_HIDDEN, GET_GRAPHQL_TYPE } from "../utils/symbols"
import type { InferInputI, InferInputO } from "./input"
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
  TInput extends
    | GraphQLSilk
    | Record<string, GraphQLSilk>
    | undefined = undefined,
  TType extends FieldOrOperationType = FieldOrOperationType,
> extends GraphQLFieldOptions {
  type: TType
  input: TInput
  output: TOutput
  resolve: TType extends "field"
    ? (
        parent: StandardSchemaV1.InferOutput<NonNullable<TParent>>,
        input: InferInputI<TInput>,
        options?: ResolvingOptions
      ) => Promise<StandardSchemaV1.InferOutput<TOutput>>
    : TType extends "subscription"
      ? (
          value: any,
          input: InferInputI<TInput>
        ) => Promise<StandardSchemaV1.InferOutput<TOutput>>
      : (
          input: InferInputI<TInput>,
          options?: ResolvingOptions
        ) => Promise<StandardSchemaV1.InferOutput<TOutput>>

  subscribe?: TType extends "subscription"
    ? (
        input: InferInputI<TInput>,
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
  TOutput extends GraphQLSilk,
  TInput extends
    | GraphQLSilk
    | Record<string, GraphQLSilk>
    | undefined = undefined,
> extends ResolverOptions<
      FieldOrOperation<undefined, TOutput, TInput, "query" | "mutation">
    >,
    GraphQLFieldOptions {
  input?: TInput
  resolve: (
    input: InferInputO<TInput>
  ) => MayPromise<StandardSchemaV1.InferOutput<TOutput>>
}

/**
 * Function to create a GraphQL query.
 */
export interface QueryFactory {
  <TOutput extends GraphQLSilk>(
    output: TOutput,
    resolve: () => MayPromise<StandardSchemaV1.InferOutput<TOutput>>
  ): FieldOrOperation<undefined, TOutput, undefined, "query">

  <
    TOutput extends GraphQLSilk,
    TInput extends
      | GraphQLSilk
      | Record<string, GraphQLSilk>
      | undefined = undefined,
  >(
    output: TOutput,
    options: QueryMutationOptions<TOutput, TInput>
  ): FieldOrOperation<undefined, TOutput, TInput, "query">

  <TOutput extends GraphQLSilk>(
    output: TOutput
  ): QueryChainFactory<TOutput, undefined>
}

export interface QueryFactoryWithChain
  extends QueryFactory,
    QueryChainFactory<never, undefined> {}

/**
 * Function to create a GraphQL mutation.
 */
export interface MutationFactory {
  <TOutput extends GraphQLSilk>(
    output: TOutput,
    resolve: () => MayPromise<StandardSchemaV1.InferOutput<TOutput>>
  ): FieldOrOperation<undefined, TOutput, undefined, "mutation">

  <
    TOutput extends GraphQLSilk,
    TInput extends
      | GraphQLSilk
      | Record<string, GraphQLSilk>
      | undefined = undefined,
  >(
    output: TOutput,
    options: QueryMutationOptions<TOutput, TInput>
  ): FieldOrOperation<undefined, TOutput, TInput, "mutation">

  <TOutput extends GraphQLSilk>(
    output: TOutput
  ): MutationChainFactory<TOutput, undefined>
}

/**
 * Function to create a GraphQL mutation.
 */
export interface MutationFactoryWithChain
  extends MutationFactory,
    MutationChainFactory<never, undefined> {}

/**
 * Options for External Filed of existing GraphQL Object.
 */
export interface FieldOptions<
  TParent extends GraphQLSilk,
  TOutput extends GraphQLSilk,
  TInput extends
    | GraphQLSilk
    | Record<string, GraphQLSilk>
    | undefined = undefined,
> extends ResolverOptions<
      FieldOrOperation<EnsureSilk<TParent>, TOutput, TInput, "field">
    >,
    GraphQLFieldOptions {
  input?: TInput
  resolve: (
    parent: StandardSchemaV1.InferOutput<TParent>,
    input: InferInputO<TInput>
  ) => MayPromise<StandardSchemaV1.InferOutput<TOutput>>
}

/**
 * Function to create a GraphQL Field.
 */
export interface FieldFactory {
  <TParent extends GraphQLSilk, TOutput extends GraphQLSilk>(
    output: TOutput,
    resolve: (
      parent: StandardSchemaV1.InferOutput<TParent>
    ) => MayPromise<StandardSchemaV1.InferOutput<TOutput>>
  ): FieldOrOperation<EnsureSilk<TParent>, TOutput, undefined, "field">

  <
    TParent extends GraphQLSilk,
    TOutput extends GraphQLSilk,
    TInput extends
      | GraphQLSilk
      | Record<string, GraphQLSilk>
      | undefined = undefined,
  >(
    output: TOutput,
    options: FieldOptions<EnsureSilk<TParent>, TOutput, TInput>
  ): FieldOrOperation<EnsureSilk<TParent>, TOutput, TInput, "field">

  <TOutput extends GraphQLSilk>(
    output: TOutput
  ): FieldChainFactory<TOutput, undefined>
}

export interface FieldFactoryWithUtils
  extends FieldFactory,
    FieldChainFactory<never, undefined> {
  /** Set fields to be hidden in GraphQL Schema */
  hidden: typeof FIELD_HIDDEN
}

/**
 * Options for creating a GraphQL Subscription.
 */
export interface SubscriptionOptions<
  TOutput extends GraphQLSilk,
  TInput extends
    | GraphQLSilk
    | Record<string, GraphQLSilk>
    | undefined = undefined,
  TValue = StandardSchemaV1.InferOutput<TOutput>,
> extends ResolverOptions<Subscription<TOutput, TInput, TValue>>,
    GraphQLFieldOptions {
  input?: TInput
  subscribe: (input: InferInputO<TInput>) => MayPromise<AsyncIterator<TValue>>
  resolve?: (
    value: TValue,
    input: InferInputO<TInput>
  ) => MayPromise<StandardSchemaV1.InferOutput<TOutput>>
}

export interface Subscription<
  TOutput extends GraphQLSilk,
  TInput extends
    | GraphQLSilk
    | Record<string, GraphQLSilk>
    | undefined = undefined,
  TValue = StandardSchemaV1.InferOutput<TOutput>,
> extends FieldOrOperation<undefined, TOutput, TInput, "subscription"> {
  resolve: (
    value: TValue,
    input: InferInputI<TInput>
  ) => Promise<StandardSchemaV1.InferOutput<TOutput>>
  subscribe: (
    input: InferInputI<TInput>,
    options?: ResolvingOptions
  ) => MayPromise<AsyncIterator<TValue>>
}

/**
 * Function to create a GraphQL subscription.
 */
export interface SubscriptionFactory {
  <TOutput extends GraphQLSilk, TValue = StandardSchemaV1.InferOutput<TOutput>>(
    output: TOutput,
    subscribe: () => MayPromise<
      AsyncIterator<StandardSchemaV1.InferOutput<TOutput>>
    >
  ): Subscription<TOutput, undefined, TValue>

  <
    TOutput extends GraphQLSilk,
    TInput extends
      | GraphQLSilk
      | Record<string, GraphQLSilk>
      | undefined = undefined,
    TValue = StandardSchemaV1.InferOutput<TOutput>,
  >(
    output: TOutput,
    options: SubscriptionOptions<TOutput, TInput, TValue>
  ): Subscription<TOutput, TInput, TValue>

  <TOutput extends GraphQLSilk>(
    output: TOutput
  ): SubscriptionChainFactory<TOutput, undefined>
}

export interface SubscriptionFactoryWithChain
  extends SubscriptionFactory,
    SubscriptionChainFactory<never, undefined> {}

export interface ResolverFactory {
  of<
    TParent extends GraphQLSilk,
    TOperations extends Record<
      string,
      | FieldOrOperation<EnsureSilk<TParent>, any, any>
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

export type EnsureSilk<T extends GraphQLSilk> = GraphQLSilk<
  StandardSchemaV1.InferOutput<T>,
  StandardSchemaV1.InferInput<T>
>
