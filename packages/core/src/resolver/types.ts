import type { InferPropertyType, IsAny, MayPromise } from "../utils"

export type SchemaIOPaths = [inputPath: string, outputPath: string]

export type InferSchemaI<TSchema, TIOPaths extends SchemaIOPaths> = NonNullable<
	InferPropertyType<TSchema, TIOPaths[0]>
>

export type InferSchemaO<TSchema, TIOPaths extends SchemaIOPaths> = NonNullable<
	InferPropertyType<TSchema, TIOPaths[1]>
>

export type SchemaIO = [input: any, output: any]

export type InferSchemaIO<TSchema, TIOPaths extends SchemaIOPaths> = [
	input: InferSchemaI<TSchema, TIOPaths>,
	output: InferSchemaO<TSchema, TIOPaths>,
]

export interface ResolverOptions {
	middleware?: ((next: () => void) => void)[]
}

export type InferInputEntriesI<
	TInputEntries extends Record<string, any> | undefined,
	TSchemaIOPaths extends SchemaIOPaths,
> = TInputEntries extends undefined
	? undefined
	: {
			[K in keyof TInputEntries]: InferSchemaI<TInputEntries[K], TSchemaIOPaths>
	  }

export type InferInputEntriesO<
	TInputEntries extends Record<string, any> | undefined,
	TSchemaIOPaths extends SchemaIOPaths,
> = TInputEntries extends undefined
	? undefined
	: {
			[K in keyof TInputEntries]: InferSchemaO<TInputEntries[K], TSchemaIOPaths>
	  }

/**
 * Operation or Field for resolver.
 */
export interface OperationOrField<
	_TSchemaIOPaths extends SchemaIOPaths,
	_TParent,
	TOutput,
	TInput extends Record<string, any> | undefined = undefined,
> {
	type: "query" | "mutation" | "field" | "subscription"
	input: TInput
	output: TOutput
}

/**
 * Operation for resolver.
 */
export interface Operation<
	TSchemaIOPaths extends SchemaIOPaths,
	TOutput,
	TInput extends Record<string, any> | undefined = undefined,
> extends OperationOrField<TSchemaIOPaths, any, TOutput, TInput> {
	type: "query" | "mutation" | "subscription"
	resolve: (
		input: InferInputEntriesI<TInput, TSchemaIOPaths>,
	) => MayPromise<InferSchemaO<TOutput, TSchemaIOPaths>>
}

/**
 * Field for resolver.
 */
export interface Field<
	TSchemaIOPaths extends SchemaIOPaths,
	TParent,
	TOutput,
	TInput extends Record<string, any> | undefined = undefined,
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
	TInput extends Record<string, any> | undefined = undefined,
> extends ResolverOptions {
	input?: TInput
	resolve: (
		input: InferInputEntriesO<TInput, TSchemaIOPaths>,
	) => MayPromise<InferSchemaO<TOutput, TSchemaIOPaths>>
}

export interface BaseOperationBuilder<
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
	): Operation<TSchemaIOPaths, TOutput, TInput>
}

/**
 * Options for External Filed of existing GraphQL Object.
 */
export interface FieldOptions<
	TSchemaIOPaths extends SchemaIOPaths,
	TParent,
	TOutput,
	TInput extends Record<string, any> | undefined = undefined,
> extends ResolverOptions {
	input?: TInput
	resolve: (
		parent: InferSchemaO<TParent, TSchemaIOPaths>,
		input: InferInputEntriesO<TInput, TSchemaIOPaths>,
	) => MayPromise<InferSchemaO<TOutput, TSchemaIOPaths>>
}

export interface BaseFieldBuilder<
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
	): OperationOrField<TSchemaIOPaths, TParent, TOutput, TInput>
}

export interface BaseResolverBuilder<
	TBaseSchema,
	TSchemaIOPaths extends SchemaIOPaths,
> {
	<
		TParent extends TBaseSchema,
		TOperations extends Record<
			string,
			OperationOrField<TSchemaIOPaths, TParent, any, any>
		>,
	>(
		parent: TParent,
		operationOrFields: TOperations,
		options?: ResolverOptions,
	): TOperations

	<TOperations extends Record<string, Operation<TSchemaIOPaths, any, any>>>(
		operations: TOperations,
		options?: ResolverOptions,
	): TOperations
}
