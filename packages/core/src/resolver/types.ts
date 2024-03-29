import type { InferPropertyType, MayPromise, Middleware } from "../utils"
import type { RESOLVER_OPTIONS_KEY } from "./resolver"
import type { InferInputI, InferInputO, InputSchema } from "./input"

export type AbstractSchemaIO = [
  baseSchema: object,
  inputPath: string,
  output: string,
]

export type InferSchemaI<
  TSchema,
  TSchemaIO extends AbstractSchemaIO,
> = InferPropertyType<TSchema, TSchemaIO[1]>

export type InferSchemaO<
  TSchema,
  TSchemaIO extends AbstractSchemaIO,
> = InferPropertyType<TSchema, TSchemaIO[2]>

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
  TSchemaIO extends AbstractSchemaIO,
  TParent,
  TOutput,
  TInput extends InputSchema<TSchemaIO[0]> = undefined,
  TType extends OperationOrFieldType = OperationOrFieldType,
> {
  type: TType
  input: TInput
  output: TOutput
  resolve: TType extends "field"
    ? (
        parent: InferSchemaO<TParent, TSchemaIO>,
        input: InferInputI<TInput, TSchemaIO>,
        options?: ResolvingOptions
      ) => Promise<InferSchemaO<TOutput, TSchemaIO>>
    : (
        input: InferInputI<TInput, TSchemaIO>,
        options?: ResolvingOptions
      ) => Promise<InferSchemaO<TOutput, TSchemaIO>>
}

/**
 * Operation for resolver.
 */
export interface Operation<
  TSchemaIO extends AbstractSchemaIO,
  TOutput,
  TInput extends InputSchema<TSchemaIO[0]> = undefined,
> extends OperationOrField<
    TSchemaIO,
    unknown,
    TOutput,
    TInput,
    "query" | "mutation" | "subscription"
  > {}

/**
 * Field for resolver.
 */
export interface Field<
  TSchemaIO extends AbstractSchemaIO,
  TParent,
  TOutput,
  TInput extends InputSchema<TSchemaIO[0]> = undefined,
> extends OperationOrField<TSchemaIO, TParent, TOutput, TInput, "field"> {}

/**
 * Options for creating a GraphQL operation.
 */
export interface OperationOptions<
  TSchemaIO extends AbstractSchemaIO,
  TOutput,
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
  ): OperationOrField<TSchemaIO, any, TOutput, TInput, OperationType>
}

/**
 * Options for External Filed of existing GraphQL Object.
 */
export interface FieldOptions<
  TSchemaIO extends AbstractSchemaIO,
  TParent,
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
  ): OperationOrField<TSchemaIO, TParent, TOutput, TInput, "field">
}

export interface ResolverWeaver<TSchemaIO extends AbstractSchemaIO> {
  of<
    TParent extends TSchemaIO[0],
    TOperations extends Record<
      string,
      OperationOrField<TSchemaIO, TParent, any, any>
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
      OperationOrField<TSchemaIO, any, any, any, OperationType>
    >,
  >(
    operations: TOperations,
    options?: ResolverOptions
  ): TOperations & {
    [RESOLVER_OPTIONS_KEY]: ResolverOptions
  }
}
