import type { AnyGraphQLFabric, GraphQLFabric } from "./fabric"
import type { FieldWeaver, OperationWeaver, ResolverWeaver } from "./types"

export type GraphQLFabricIOPaths = [
	input: "_types.input",
	output: "_types.output",
]

const notImplemented: any = 0

export const fabricQuery: OperationWeaver<
	AnyGraphQLFabric,
	GraphQLFabricIOPaths
> = notImplemented

export const fabricMutation: OperationWeaver<
	AnyGraphQLFabric,
	GraphQLFabricIOPaths
> = notImplemented

export const fabricField: FieldWeaver<AnyGraphQLFabric, GraphQLFabricIOPaths> =
	notImplemented

export const fabricResolver: ResolverWeaver<
	AnyGraphQLFabric,
	GraphQLFabricIOPaths
> = notImplemented
