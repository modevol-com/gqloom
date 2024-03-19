import type { GraphQLFabric, InferSchemaIO } from "@gqloom/core"
import { GraphQLString } from "graphql"
import type { InferType, Schema } from "yup"
import { object, date, string, number } from "yup"

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

export function fabric<TSchema extends Schema>(
	schema: TSchema,
): YupFabric<TSchema> {
	return new YupFabric(schema)
}

type YupSchemaIOPaths = ["__outputType", "__outputType"]

type InferYupSchemaIO<TSchema extends Schema> = InferSchemaIO<
	TSchema,
	YupSchemaIOPaths
>

const Giraffe = object({
	name: string().required(),
	birthday: date().required(),
	heightInMeters: number().required(),
})

type IGiraffe = InferYupSchemaIO<typeof Giraffe>
