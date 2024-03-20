import { isType } from "graphql"
import type {
	GraphQLFabric,
	OperationOptions,
	FieldOptions,
	OperationOrField,
	ResolverOptions,
} from ".."

export function getResolverArgs(
	[arg1, arg2, arg3]: [
		arg1:
			| GraphQLFabric<any, any>
			| Record<string, OperationOrField<any, any, any>>,
		arg2?: Record<string, OperationOrField<any, any, any>> | ResolverOptions,
		arg3?: ResolverOptions,
	],
	isValidSchema: (arg: any) => boolean = isType,
) {
	const parent = isValidSchema(arg1.type) ? arg1 : undefined
	const operations = (parent != null ? arg2 : arg1) as Record<
		string,
		OperationOrField<any, any, any>
	>
	const options = parent != null ? arg3 : (arg2 as ResolverOptions | undefined)
	return { parent, operations, options }
}

export function getOperationOptions(
	resolveOrOptions:
		| ((parent: any) => any)
		| OperationOptions<any, any, any>
		| FieldOptions<any, any, any, any>,
) {
	if (typeof resolveOrOptions === "function") {
		return { resolve: resolveOrOptions }
	}
	return resolveOrOptions
}
