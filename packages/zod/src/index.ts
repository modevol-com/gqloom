import { createResolverWeavers, type GraphQLFabric } from "@gqloom/core"
import { GraphQLString } from "graphql"
import type { Schema, input, output } from "zod"

export class ZodFabric<TSchema extends Schema>
	implements GraphQLFabric<output<TSchema>, input<TSchema>>
{
	_types?: { input: input<TSchema>; output: output<TSchema> }
	constructor(public schema: TSchema) {}

	get type() {
		return GraphQLString
	}

	parse(input: input<TSchema>): Promise<output<TSchema>> {
		return this.schema.parseAsync(input)
	}
}

export type ZodSchemaIOPaths = ["_input", "_output"]

export function zodFabric<TSchema extends Schema>(
	schema: TSchema,
): ZodFabric<TSchema> {
	return new ZodFabric(schema)
}

export const { query, mutation, field, resolver } = createResolverWeavers<
	Schema,
	ZodSchemaIOPaths
>(zodFabric)
