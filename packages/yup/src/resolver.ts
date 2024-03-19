import type {
	GraphQLFabric,
	GraphQLFabricOutput,
	MayPromise,
	OperationOptionsWithParent,
	OperationOrField,
} from "@gqloom/core"
import { baseField, baseMutation, baseQuery, baseResolver } from "@gqloom/core"
import { InferType, type Schema, type ObjectSchema, isSchema } from "yup"
import { type YupFabric, fabric } from "./fabric"

export type YupInputEntries = Record<string, Schema> | ObjectSchema<any>

export type InferYupInputEntries<T extends YupInputEntries | undefined> =
	T extends undefined
		? undefined
		: T extends ObjectSchema<any>
		  ? YupFabric<T>
		  : {
					[K in keyof T]: T[K] extends Schema ? YupFabric<T[K]> : T[K]
			  }

export function field<
	TParent extends Schema<any, any>,
	TOutput extends Schema<any, any>,
	TInput extends YupInputEntries | undefined = undefined,
>(
	output: TOutput,
	resolveOrOptions:
		| ((
				parent: GraphQLFabricOutput<YupFabric<TParent>>,
		  ) => MayPromise<GraphQLFabricOutput<YupFabric<TOutput>>>)
		| OperationOptionsWithParent<
				YupFabric<TParent>,
				YupFabric<TOutput>,
				InferYupInputEntries<TInput>
		  >,
): OperationOrField<
	YupFabric<TParent>,
	YupFabric<TOutput>,
	InferYupInputEntries<TInput>
> {
	const options = (() => {
		if (typeof resolveOrOptions === "function") {
			return { resolve: resolveOrOptions }
		}
		return resolveOrOptions
	})()

	const input = (() => {
		const inputO = options.input
		if (inputO == null) return undefined
		if (isYupSchema(inputO)) {
			return fabric(inputO)
		}
	})()

	return baseField(fabric(output), {
		...options,
		input: options.input && fabric(options.input),
	})
}

function isYupSchema(x: any): x is Schema {
	return x && typeof x.validate === "function"
}
