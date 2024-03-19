import type { GraphQLFabric } from "./fabric"
import type {
	BaseFieldBuilder,
	BaseOperationBuilder,
	BaseResolverBuilder,
} from "./types"

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
