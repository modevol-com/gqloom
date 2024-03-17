import type { MayPromise } from "../utils"
import type {
	GraphQLFabric,
	GraphQLFabricInput,
	GraphQLFabricOutput,
} from "./fabric"

/**
 * Input entries for creating a GraphQL operation.
 */
export interface FabricInputEntries {
	[name: string]: GraphQLFabric<any, any>
}

/**
 * Infer input entries from a GraphQLFabric.
 */
export type InferFabricInputEntries<T extends FabricInputEntries> = {
	[K in keyof T]: GraphQLFabricInput<T[K]>
}

/**
 * Options for creating a GraphQL operation.
 */
export interface OperationOptions<
	TOutput extends GraphQLFabric<any, any>,
	TInput extends FabricInputEntries | undefined = undefined,
> {
	input?: TInput
	resolve: (
		input: TInput extends undefined
			? undefined
			: InferFabricInputEntries<NonNullable<TInput>>,
	) => MayPromise<GraphQLFabricOutput<TOutput>>
}

/**
 * Options for creating a GraphQL operation with parent.
 */
export interface OperationOptionsWithParent<
	TParent extends GraphQLFabric<any, any>,
	TOutput extends GraphQLFabric<any, any>,
	TInput extends FabricInputEntries | undefined = undefined,
> {
	input?: TInput
	resolve: (
		parent: GraphQLFabricOutput<TParent>,
		input: TInput extends undefined
			? undefined
			: InferFabricInputEntries<NonNullable<TInput>>,
	) => MayPromise<GraphQLFabricOutput<TOutput>>
}

/**
 * Operation function for query, mutation, field and subscription.
 */
export interface Operation<
	TParent extends GraphQLFabric<any, any>,
	TOutput extends GraphQLFabric<any, any>,
	TInput extends FabricInputEntries | undefined = undefined,
> {
	(parent: TParent, input: TInput): MayPromise<GraphQLFabricOutput<TOutput>>
	options: {
		input: TInput
	}
}

export function baseField<
	TParent extends GraphQLFabric<any, any>,
	TOutput extends GraphQLFabric<any, any>,
	TInput extends FabricInputEntries | undefined = undefined,
>(
	outputSchema: TOutput,
	resolveOrOptions:
		| ((
				parent: GraphQLFabricOutput<TParent>,
		  ) => MayPromise<GraphQLFabricOutput<TOutput>>)
		| OperationOptionsWithParent<TParent, TOutput, TInput>,
): Operation<TParent, TOutput, TInput> {
	return 0 as any
}

export function baseQuery<
	TOutput extends GraphQLFabric<any, any>,
	TInput extends FabricInputEntries | undefined = undefined,
>(
	outputSchema: TOutput,
	resolveOrOptions:
		| (() => MayPromise<GraphQLFabricOutput<TOutput>>)
		| OperationOptions<TOutput, TInput>,
): Operation<any, TOutput, TInput> {
	return 0 as any
}

export function baseMutation<
	TOutput extends GraphQLFabric<any, any>,
	TInput extends FabricInputEntries | undefined = undefined,
>(
	outputSchema: TOutput,
	resolveOrOptions:
		| (() => MayPromise<GraphQLFabricOutput<TOutput>>)
		| OperationOptions<TOutput, TInput>,
): Operation<any, TOutput, TInput> {
	return 0 as any
}

export function baseResolver<
	TParent extends GraphQLFabric<any, any>,
	TOperation extends Record<string, Operation<TParent, any, any>>,
>(parent: TParent, operations: TOperation): TOperation {
	return operations
}
