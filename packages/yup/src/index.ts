import { createResolverWeavers, type GraphQLFabric } from "@gqloom/core"
import { GraphQLString } from "graphql"
import type { InferType, Schema } from "yup"

export class YupFabric<TSchema extends Schema>
	implements GraphQLFabric<InferType<TSchema>, InferType<TSchema>>
{
	_types?: { input: InferType<TSchema>; output: InferType<TSchema> }
	constructor(public schema: TSchema) {}

	get type() {
		return GraphQLString
	}

	parse(input: InferType<TSchema>): Promise<InferType<TSchema>> {
		return this.schema.cast(input)
	}
}

export type YupSchemaIOPaths = ["__outputType", "__outputType"]

export function yupFabric<TSchema extends Schema>(
	schema: TSchema,
): YupFabric<TSchema> {
	return new YupFabric(schema)
}

export const { query, mutation, field, resolver } = createResolverWeavers<
	Schema,
	YupSchemaIOPaths
>(yupFabric)
