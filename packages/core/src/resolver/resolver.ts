import type { GraphQLFabric } from "./fabric"
import type { FieldWeaver, OperationWeaver, ResolverWeaver } from "./types"

export type GraphQLFabricIOPaths = [
	input: "_types.input",
	output: "_types.output",
]

export const fabricQuery: OperationWeaver<
	GraphQLFabric<any, any>,
	GraphQLFabricIOPaths
> = 0 as any

export const fabricMutation: OperationWeaver<
	GraphQLFabric<any, any>,
	GraphQLFabricIOPaths
> = 0 as any

export const fabricField: FieldWeaver<
	GraphQLFabric<any, any>,
	GraphQLFabricIOPaths
> = 0 as any

export const fabricResolver: ResolverWeaver<
	GraphQLFabric<any, any>,
	GraphQLFabricIOPaths
> = 0 as any
