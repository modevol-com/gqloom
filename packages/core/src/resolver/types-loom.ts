import type { StandardSchemaV1 } from "@standard-schema/spec"
import type { MayPromise, Middleware } from "../utils"
import type { FIELD_HIDDEN, IS_RESOLVER } from "../utils/symbols"
import type { InferInputO } from "./input"
import type {
  GraphQLFieldOptions,
  GraphQLSilk,
  ResolverOptionsWithExtensions,
  ResolverPayload,
} from "./types"

export interface FieldMeta extends GraphQLFieldOptions {
  operation: "field" | "query" | "mutation" | "subscription"
  output: GraphQLSilk
  input: GraphQLSilk | Record<string, GraphQLSilk> | void
  middlewares?: Middleware[] | undefined
  dependencies?: string[] | undefined
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
    middlewares?: Middleware[] | undefined
    dependencies?: TDependencies
    types?: { parent: ReSilk<TParent> } | undefined
    resolve: (
      parent: StandardSchemaV1.InferOutput<NonNullable<TParent>>,
      input: InferInputO<TInput>,
      payload: ResolverPayload | void
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
    middlewares?: Middleware[] | undefined
    resolve: (
      input: InferInputO<TInput>,
      payload: ResolverPayload | void
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
    middlewares?: Middleware[] | undefined
    resolve: (
      input: InferInputO<TInput>,
      payload: ResolverPayload | void
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
    middlewares?: Middleware[] | undefined
    types?: ({ value: TValue } & GraphQLFieldOptions) | undefined

    resolve: (
      value: TValue,
      input: InferInputO<TInput>,
      payload: ResolverPayload | void
    ) => MayPromise<StandardSchemaV1.InferOutput<TOutput>>

    subscribe: (
      input: InferInputO<TInput>,
      payload: ResolverPayload | void
    ) => MayPromise<AsyncIterator<TValue>>
  } & GraphQLFieldOptions
}

export interface Resolver {
  readonly "~meta": {
    [IS_RESOLVER]: true
    fields: Record<string, BaseField | typeof FIELD_HIDDEN>
    options?: ResolverOptionsWithExtensions<any> | undefined
    parent?: GraphQLSilk | undefined
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
