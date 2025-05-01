import type { StandardSchemaV1 } from "@standard-schema/spec"
import type { MayPromise } from "../utils"
import type { FIELD_HIDDEN, IS_RESOLVER } from "../utils/symbols"
import type { InferInputI } from "./input"
import type {
  GraphQLFieldOptions,
  GraphQLSilk,
  ResolverOptionsWithExtensions,
  ResolvingOptions,
} from "./types"

export interface FieldMeta extends GraphQLFieldOptions {
  operation: "field" | "query" | "mutation" | "subscription"
  output: GraphQLSilk
  input: GraphQLSilk | Record<string, GraphQLSilk> | void
  dependencies?: string[]
  resolve: (...args: any) => MayPromise<any>
}

export interface BaseField {
  readonly "~meta": FieldMeta
}

export interface Field<
  TParent extends GraphQLSilk,
  TOutput extends GraphQLSilk,
  TInput extends GraphQLSilk | Record<string, GraphQLSilk> | void = void,
  TDependencies extends string[] | undefined = undefined,
> extends BaseField {
  "~meta": {
    operation: "field"
    output: TOutput
    input: TInput
    dependencies?: TDependencies
    types?: {
      parent: ReSilk<TParent>
    }
    resolve: (
      parent: StandardSchemaV1.InferOutput<NonNullable<TParent>>,
      input: InferInputI<TInput>,
      options?: ResolvingOptions
    ) => Promise<StandardSchemaV1.InferOutput<TOutput>>
  } & GraphQLFieldOptions
}

export interface Query<
  TOutput extends GraphQLSilk,
  TInput extends GraphQLSilk | Record<string, GraphQLSilk> | void = void,
> extends BaseField {
  "~meta": {
    operation: "query"
    parent?: undefined
    output: TOutput
    input: TInput
    resolve: (
      input: InferInputI<TInput>,
      options?: ResolvingOptions
    ) => Promise<StandardSchemaV1.InferOutput<TOutput>>
  } & GraphQLFieldOptions
}

export interface Mutation<
  TOutput extends GraphQLSilk,
  TInput extends GraphQLSilk | Record<string, GraphQLSilk> | void = void,
> extends BaseField {
  "~meta": {
    operation: "mutation"
    parent?: undefined
    output: TOutput
    input: TInput
    resolve: (
      input: InferInputI<TInput>,
      options?: ResolvingOptions
    ) => Promise<StandardSchemaV1.InferOutput<TOutput>>
  } & GraphQLFieldOptions
}

export interface Subscription<
  TOutput extends GraphQLSilk,
  TInput extends GraphQLSilk | Record<string, GraphQLSilk> | void = void,
  TValue = StandardSchemaV1.InferOutput<TOutput>,
> extends BaseField {
  "~meta": {
    operation: "subscription"
    parent?: undefined
    output: TOutput
    input: TInput
    types?: {
      value: TValue
    } & GraphQLFieldOptions

    resolve: (
      value: TValue,
      input: InferInputI<TInput>,
      options?: ResolvingOptions
    ) => MayPromise<StandardSchemaV1.InferOutput<TOutput>>

    subscribe: (
      input: InferInputI<TInput>,
      options?: ResolvingOptions
    ) => MayPromise<AsyncIterator<TValue>>
  } & GraphQLFieldOptions
}

export interface Resolver {
  readonly "~meta": {
    [IS_RESOLVER]: true
    fields: Record<string, BaseField | typeof FIELD_HIDDEN>
    options?: ResolverOptionsWithExtensions<any>
    parent?: GraphQLSilk
  }
}

export type Operation =
  | Query<GraphQLSilk, GraphQLSilk | Record<string, GraphQLSilk> | void>
  | Mutation<GraphQLSilk, GraphQLSilk | Record<string, GraphQLSilk> | void>
  | Subscription<
      GraphQLSilk,
      GraphQLSilk | Record<string, GraphQLSilk> | void,
      any
    >

export type FieldOrOperation =
  | Field<
      GraphQLSilk,
      GraphQLSilk,
      GraphQLSilk | Record<string, GraphQLSilk> | void,
      string[] | undefined
    >
  | Operation

type ReSilk<T extends GraphQLSilk> = GraphQLSilk<
  NonNullable<T["~standard"]["types"]>["output"],
  NonNullable<T["~standard"]["types"]>["input"]
>
