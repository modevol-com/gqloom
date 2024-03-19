import { getResolverArgs, type IsAny, type MayPromise } from "../utils"
import type {
	GraphQLFabric,
	GraphQLFabricInput,
	GraphQLFabricOutput,
} from "./fabric"
import type {
	BaseFieldBuilder,
	BaseOperationBuilder,
	BaseResolverBuilder,
	ResolverOptions,
} from "./types"

/**
 * Input entries for creating a GraphQL operation.
 */
export type BaseInputEntries =
	| Record<string, GraphQLFabric<any, any>>
	| GraphQLFabric<any, any>

/**
 * Infer input entries from a GraphQLFabric.
 */
export type InferBaseInputEntries<T extends BaseInputEntries | undefined> =
	T extends GraphQLFabric<infer TInput, any>
		? TInput
		: T extends undefined
		  ? undefined
		  : {
					[K in keyof T]: T[K] extends GraphQLFabric<any, any>
						? GraphQLFabricInput<T[K]>
						: T[K]
			  }

/**
 * Options for creating a GraphQL operation.
 */
export interface OperationOptions<
	TOutput extends GraphQLFabric<any, any>,
	TInput extends BaseInputEntries | undefined = undefined,
> extends ResolverOptions {
	input?: TInput
	resolve: (
		input: TInput extends undefined
			? undefined
			: InferBaseInputEntries<NonNullable<TInput>>,
	) => MayPromise<GraphQLFabricOutput<TOutput>>
}

/**
 * Options for creating a GraphQL operation with parent.
 */
export interface OperationOptionsWithParent<
	TParent extends GraphQLFabric<any, any>,
	TOutput extends GraphQLFabric<any, any>,
	TInput extends BaseInputEntries | undefined = undefined,
> extends ResolverOptions {
	input?: TInput
	resolve: (
		parent: GraphQLFabricOutput<TParent>,
		input: TInput extends undefined
			? undefined
			: InferBaseInputEntries<NonNullable<TInput>>,
	) => MayPromise<GraphQLFabricOutput<TOutput>>
}

/**
 * Operation or Field.
 */
export interface OperationOrField<
	TParent extends GraphQLFabric<any, any> | undefined,
	TOutput extends GraphQLFabric<any, any>,
	TInput extends BaseInputEntries | undefined = undefined,
> {
	type: "query" | "mutation" | "field" | "subscription"
	resolve: IsAny<TParent> extends true
		? (
				input: InferBaseInputEntries<TInput>,
		  ) => MayPromise<GraphQLFabricOutput<TOutput>>
		: TParent extends GraphQLFabric<any, any>
		  ? (
					parent: GraphQLFabricOutput<TParent>,
					input: InferBaseInputEntries<TInput>,
			  ) => MayPromise<GraphQLFabricOutput<TOutput>>
		  : (input: TInput) => MayPromise<GraphQLFabricOutput<TOutput>>
	input: TInput
	output: TOutput
}

export interface Operation<
	TOutput extends GraphQLFabric<any, any>,
	TInput extends BaseInputEntries | undefined = undefined,
> extends OperationOrField<any, TOutput, TInput> {
	type: "query" | "mutation" | "subscription"
}

export function baseField<
	TParent extends GraphQLFabric<any, any>,
	TOutput extends GraphQLFabric<any, any>,
	TInput extends BaseInputEntries | undefined = undefined,
>(
	output: TOutput,
	resolveOrOptions:
		| ((
				parent: GraphQLFabricOutput<TParent>,
		  ) => MayPromise<GraphQLFabricOutput<TOutput>>)
		| OperationOptionsWithParent<TParent, TOutput, TInput>,
): OperationOrField<TParent, TOutput, TInput> {
	return 0 as any
}

export function baseQuery<
	TOutput extends GraphQLFabric<any, any>,
	TInput extends BaseInputEntries | undefined = undefined,
>(
	output: TOutput,
	resolveOrOptions:
		| (() => MayPromise<GraphQLFabricOutput<TOutput>>)
		| OperationOptions<TOutput, TInput>,
): Operation<TOutput, TInput> {
	return 0 as any
}

export function baseMutation<
	TOutput extends GraphQLFabric<any, any>,
	TInput extends BaseInputEntries | undefined = undefined,
>(
	output: TOutput,
	resolveOrOptions:
		| (() => MayPromise<GraphQLFabricOutput<TOutput>>)
		| OperationOptions<TOutput, TInput>,
): Operation<TOutput, TInput> {
	return 0 as any
}

/**
 * Create a resolver for a GraphQLFabric.
 * @param parent the source of the external fields
 * @param operationOrFields the query, mutations or fields to resolve
 */
export function baseResolver<
	TParent extends GraphQLFabric<any, any>,
	TOperations extends Record<string, OperationOrField<TParent, any, any>>,
>(
	parent: TParent,
	operationOrFields: TOperations,
	options?: ResolverOptions,
): TOperations

/**
 * Create a resolver.
 * @param operations the query or mutations to resolve
 */
export function baseResolver<
	TOperations extends Record<string, Operation<any, any>>,
>(operations: TOperations, options?: ResolverOptions): TOperations

export function baseResolver(
	arg1:
		| GraphQLFabric<any, any>
		| Record<string, OperationOrField<any, any, any>>,
	arg2?: Record<string, OperationOrField<any, any, any>> | ResolverOptions,
	arg3?: ResolverOptions,
): Record<string, OperationOrField<any, any, any>> {
	const { operations } = getResolverArgs([arg1, arg2, arg3])
	return operations
}

export type GraphQLFabricIOPaths = [
	input: "_types.input",
	output: "_types.output",
]

export const fabricQuery: BaseOperationBuilder<
	GraphQLFabric<any, any>,
	GraphQLFabricIOPaths
> = 0 as any

export const fabricMutation: BaseOperationBuilder<
	GraphQLFabric<any, any>,
	GraphQLFabricIOPaths
> = 0 as any

export const fabricField: BaseFieldBuilder<
	GraphQLFabric<any, any>,
	GraphQLFabricIOPaths
> = 0 as any

export const fabricResolver: BaseResolverBuilder<
	GraphQLFabric<any, any>,
	GraphQLFabricIOPaths
> = 0 as any
