import type { StandardSchemaV1 } from "@standard-schema/spec"
import type {
  GraphQLFieldConfig,
  GraphQLObjectTypeConfig,
  GraphQLOutputType,
} from "graphql"
import type { MayPromise, Middleware, RequireKeys } from "../utils"
import type { FIELD_HIDDEN, GET_GRAPHQL_TYPE } from "../utils/symbols"
import type { InferInputO } from "./input"
import type {
  FieldChainFactory,
  MutationChainFactory,
  QueryChainFactory,
  SubscriptionChainFactory,
} from "./resolver-chain-factory"
import type * as Loom from "./types-loom"

export * from "./types-loom"
export type { Loom }

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
  TField extends Loom.FieldOrOperation = Loom.FieldOrOperation,
> {
  middlewares?: Middleware<TField>[]
}

export interface ResolverOptionsWithExtensions<
  TField extends Loom.FieldOrOperation = Loom.FieldOrOperation,
> extends ResolverOptions<TField>,
    Pick<GraphQLObjectTypeConfig<any, any>, "extensions"> {}

export interface ResolverOptionsWithParent<
  TField extends Loom.FieldOrOperation = Loom.FieldOrOperation,
> extends ResolverOptionsWithExtensions<TField> {
  parent?: TField extends Loom.Field<infer TParent, any, any, any>
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

export type InferFieldInput<TField extends Loom.BaseField> =
  TField["~meta"]["input"]

export type InferFieldOutput<TField extends Loom.BaseField> =
  TField["~meta"]["output"]

/**
 * Options for creating a GraphQL Query.
 */
export interface QueryOptions<
  TOutput extends GraphQLSilk,
  TInput extends
    | GraphQLSilk
    | Record<string, GraphQLSilk>
    | undefined = undefined,
> extends ResolverOptions<Loom.Query<TOutput, TInput>>,
    GraphQLFieldOptions {
  input?: TInput
  resolve: (
    input: InferInputO<TInput>
  ) => MayPromise<StandardSchemaV1.InferOutput<TOutput>>
}

/**
 * Options for creating a GraphQL Mutation.
 */
export interface MutationOptions<
  TOutput extends GraphQLSilk,
  TInput extends
    | GraphQLSilk
    | Record<string, GraphQLSilk>
    | undefined = undefined,
> extends ResolverOptions<Loom.Mutation<TOutput, TInput>>,
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
  ): Loom.Query<TOutput, undefined>

  <
    TOutput extends GraphQLSilk,
    TInput extends
      | GraphQLSilk
      | Record<string, GraphQLSilk>
      | undefined = undefined,
  >(
    output: TOutput,
    options: QueryOptions<TOutput, TInput>
  ): Loom.Query<TOutput, TInput>

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
  ): Loom.Mutation<TOutput, undefined>

  <
    TOutput extends GraphQLSilk,
    TInput extends
      | GraphQLSilk
      | Record<string, GraphQLSilk>
      | undefined = undefined,
  >(
    output: TOutput,
    options: MutationOptions<TOutput, TInput>
  ): Loom.Mutation<TOutput, TInput>

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
  TDependencies extends string[] | undefined = undefined,
> extends ResolverOptions<Loom.Field<TParent, TOutput, TInput, TDependencies>>,
    GraphQLFieldOptions {
  input?: TInput
  dependencies?: TDependencies
  resolve: (
    parent: TDependencies extends string[]
      ? RequireKeys<
          StandardSchemaV1.InferOutput<TParent>,
          TDependencies[number]
        >
      : StandardSchemaV1.InferOutput<TParent>,
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
  ): Loom.Field<TParent, TOutput, undefined, undefined>

  <TParent extends GraphQLSilk, TOutput extends GraphQLSilk>(
    output: TOutput,
    options: FieldOptions<TParent, TOutput, undefined, undefined>
  ): Loom.Field<TParent, TOutput, undefined, undefined>

  <
    TParent extends GraphQLSilk,
    TOutput extends GraphQLSilk,
    TInput extends GraphQLSilk | Record<string, GraphQLSilk> | undefined,
  >(
    output: TOutput,
    options: FieldOptions<TParent, TOutput, TInput, undefined> & {
      input: TInput
    }
  ): Loom.Field<TParent, TOutput, TInput, undefined>

  <
    TParent extends GraphQLSilk,
    TOutput extends GraphQLSilk,
    const TDependencies extends string[] | undefined,
  >(
    output: TOutput,
    options: FieldOptions<TParent, TOutput, undefined, TDependencies> & {
      dependencies: TDependencies
    }
  ): Loom.Field<TParent, TOutput, undefined, TDependencies>

  <
    TParent extends GraphQLSilk,
    TOutput extends GraphQLSilk,
    TInput extends GraphQLSilk | Record<string, GraphQLSilk> | undefined,
    TDependencies extends string[] | undefined,
  >(
    output: TOutput,
    options: FieldOptions<TParent, TOutput, TInput, TDependencies> & {
      input: TInput
      dependencies: TDependencies
    }
  ): Loom.Field<TParent, TOutput, TInput, TDependencies>

  <TOutput extends GraphQLSilk>(
    output: TOutput
  ): FieldChainFactory<TOutput, undefined, undefined>
}

export interface FieldFactoryWithUtils
  extends FieldFactory,
    FieldChainFactory<never, undefined, undefined> {
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
> extends ResolverOptions<Loom.Subscription<TOutput, TInput, TValue>>,
    GraphQLFieldOptions {
  input?: TInput
  subscribe: (input: InferInputO<TInput>) => MayPromise<AsyncIterator<TValue>>
  resolve?: (
    value: TValue,
    input: InferInputO<TInput>
  ) => MayPromise<StandardSchemaV1.InferOutput<TOutput>>
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
  ): Loom.Subscription<TOutput, undefined, TValue>

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
  ): Loom.Subscription<TOutput, TInput, TValue>

  <TOutput extends GraphQLSilk>(
    output: TOutput
  ): SubscriptionChainFactory<TOutput, undefined>
}

export interface SubscriptionFactoryWithChain
  extends SubscriptionFactory,
    SubscriptionChainFactory<never, undefined> {}
