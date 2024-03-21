import type { InferPropertyType, MayPromise } from "../utils"

export type SchemaIOPaths = [inputPath: string, outputPath: string]

export type InferSchemaI<
	TSchema,
	TIOPaths extends SchemaIOPaths,
> = InferPropertyType<TSchema, TIOPaths[0]>

export type InferSchemaO<
	TSchema,
	TIOPaths extends SchemaIOPaths,
> = InferPropertyType<TSchema, TIOPaths[1]>

export type InferSchemaIO<TSchema, TIOPaths extends SchemaIOPaths> = [
	input: InferSchemaI<TSchema, TIOPaths>,
	output: InferSchemaO<TSchema, TIOPaths>,
]

export interface ResolverOptions {
	middleware?: ((next: () => void) => void)[]
}

export type InferInputEntriesI<
	TInputEntries extends Record<string, unknown> | undefined,
	TSchemaIOPaths extends SchemaIOPaths,
> = TInputEntries extends undefined
	? undefined
	: {
			[K in keyof TInputEntries]: InferSchemaI<TInputEntries[K], TSchemaIOPaths>
	  }

export type InferInputEntriesO<
	TInputEntries extends Record<string, unknown> | undefined,
	TSchemaIOPaths extends SchemaIOPaths,
> = TInputEntries extends undefined
	? undefined
	: {
			[K in keyof TInputEntries]: InferSchemaO<TInputEntries[K], TSchemaIOPaths>
	  }

export type OperationType = "query" | "mutation" | "subscription"

export type OperationOrFieldType = OperationType | "field"

/**
 * Operation or Field for resolver.
 */
export interface OperationOrField<
	TSchemaIOPaths extends SchemaIOPaths,
	TParent,
	TOutput,
	TInput extends Record<string, unknown> | undefined = undefined,
	TType extends OperationOrFieldType = OperationOrFieldType,
> {
	type: TType
	input: TInput
	output: TOutput
	resolve: TType extends "field"
		? (
				parent: InferSchemaO<TParent, TSchemaIOPaths>,
				input: InferInputEntriesI<TInput, TSchemaIOPaths>,
		  ) => MayPromise<InferSchemaO<TOutput, TSchemaIOPaths>>
		: (
				input: InferInputEntriesI<TInput, TSchemaIOPaths>,
		  ) => MayPromise<InferSchemaO<TOutput, TSchemaIOPaths>>
}

/**
 * Operation for resolver.
 */
export interface Operation<
	TSchemaIOPaths extends SchemaIOPaths,
	TOutput,
	TInput extends Record<string, unknown> | undefined = undefined,
> extends OperationOrField<
		TSchemaIOPaths,
		unknown,
		TOutput,
		TInput,
		"query" | "mutation" | "subscription"
	> {}

/**
 * Field for resolver.
 */
export interface Field<
	TSchemaIOPaths extends SchemaIOPaths,
	TParent,
	TOutput,
	TInput extends Record<string, unknown> | undefined = undefined,
> extends OperationOrField<TSchemaIOPaths, TParent, TOutput, TInput> {
	type: "field"
	resolve: (
		parent: InferSchemaO<TParent, TSchemaIOPaths>,
		input: InferInputEntriesI<TInput, TSchemaIOPaths>,
	) => MayPromise<InferSchemaO<TOutput, TSchemaIOPaths>>
}

/**
 * Options for creating a GraphQL operation.
 */
export interface OperationOptions<
	TSchemaIOPaths extends SchemaIOPaths,
	TOutput,
	TInput extends Record<string, unknown> | undefined = undefined,
> extends ResolverOptions {
	input?: TInput
	resolve: (
		input: InferInputEntriesO<TInput, TSchemaIOPaths>,
	) => MayPromise<InferSchemaO<TOutput, TSchemaIOPaths>>
}

export interface OperationWeaver<
	TBaseSchema,
	TSchemaIOPaths extends SchemaIOPaths,
> {
	<
		TOutput extends TBaseSchema,
		TInput extends Record<string, TBaseSchema> | undefined = undefined,
	>(
		output: TOutput,
		resolveOrOptions:
			| (() => MayPromise<InferSchemaO<TOutput, TSchemaIOPaths>>)
			| OperationOptions<TSchemaIOPaths, TOutput, TInput>,
		// biome-ignore lint/suspicious/noExplicitAny: allow any Parent
	): OperationOrField<TSchemaIOPaths, any, TOutput, TInput, OperationType>
}

/**
 * Options for External Filed of existing GraphQL Object.
 */
export interface FieldOptions<
	TSchemaIOPaths extends SchemaIOPaths,
	TParent,
	TOutput,
	TInput extends Record<string, unknown> | undefined = undefined,
> extends ResolverOptions {
	input?: TInput
	resolve: (
		parent: InferSchemaO<TParent, TSchemaIOPaths>,
		input: InferInputEntriesO<TInput, TSchemaIOPaths>,
	) => MayPromise<InferSchemaO<TOutput, TSchemaIOPaths>>
}

export interface FieldWeaver<
	TBaseSchema,
	TSchemaIOPaths extends SchemaIOPaths,
> {
	<
		TParent extends TBaseSchema,
		TOutput extends TBaseSchema,
		TInput extends Record<string, TBaseSchema> | undefined = undefined,
	>(
		output: TOutput,
		resolveOrOptions:
			| ((
					parent: InferSchemaO<TParent, TSchemaIOPaths>,
			  ) => MayPromise<InferSchemaO<TOutput, TSchemaIOPaths>>)
			| FieldOptions<TSchemaIOPaths, TParent, TOutput, TInput>,
	): OperationOrField<TSchemaIOPaths, TParent, TOutput, TInput, "field">
}

export interface ResolverWeaver<
	TBaseSchema,
	TSchemaIOPaths extends SchemaIOPaths,
> {
	of<
		TParent extends TBaseSchema,
		TOperations extends Record<
			string,
			// biome-ignore lint/suspicious/noExplicitAny: allow any Output and Input
			OperationOrField<TSchemaIOPaths, TParent, any, any>
		>,
	>(
		parent: TParent,
		operationOrFields: TOperations,
		options?: ResolverOptions,
	): TOperations

	<
		TOperations extends Record<
			string,
			// biome-ignore lint/suspicious/noExplicitAny: allow any Output and Input
			OperationOrField<TSchemaIOPaths, any, any, any, OperationType>
		>,
	>(
		operations: TOperations,
		options?: ResolverOptions,
	): TOperations
}
