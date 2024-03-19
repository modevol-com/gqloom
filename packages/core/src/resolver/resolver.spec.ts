import {
	GraphQLFloat,
	GraphQLInt,
	GraphQLNonNull,
	GraphQLObjectType,
	GraphQLString,
} from "graphql"
import { test } from "vitest"
import { type GraphQLFabric, fabric } from "./fabric"
import {
	fabricField as field,
	fabricMutation as mutation,
	fabricQuery as query,
	fabricResolver as resolver,
} from "./resolver"

test("base resolver", () => {
	interface IGiraffe {
		name: string
		birthday: Date
		heightInMeters: number
	}

	const Giraffe = fabric<IGiraffe>(
		new GraphQLObjectType({
			name: "Giraffe",
			fields: {
				name: { type: new GraphQLNonNull(GraphQLString) },
				birthday: { type: new GraphQLNonNull(GraphQLString) },
				heightInMeters: { type: new GraphQLNonNull(GraphQLFloat) },
			},
		}),
	)

	const GiraffeInput = fabric<Partial<IGiraffe>>(
		new GraphQLObjectType({
			name: "GiraffeInput",
			fields: {
				name: { type: GraphQLString },
				birthday: { type: GraphQLString },
				heightInMeters: { type: GraphQLFloat },
			},
		}),
	)

	const createGiraffe = mutation(Giraffe, {
		input: { data: GiraffeInput },
		resolve: ({ data }) => ({
			name: data.name ?? "Giraffe",
			birthday: data.birthday ?? new Date(),
			heightInMeters: data.heightInMeters ?? 5,
		}),
	})

	const simpleGiraffeResolver = resolver({
		createGiraffe: createGiraffe,
	})

	const giraffeResolver = resolver(Giraffe, {
		age: field(fabric<number>(GraphQLInt), async (giraffe) => {
			return new Date().getFullYear() - giraffe.birthday.getFullYear()
		}),

		giraffe: query(Giraffe, {
			input: { name: fabric<string>(GraphQLString) },
			resolve: ({ name }) => ({
				name,
				birthday: new Date(),
				heightInMeters: 5,
			}),
		}),

		greeting: field(fabric<string>(GraphQLString), {
			input: { myName: fabric<string>(GraphQLString) },
			resolve: (giraffe, { myName }) =>
				`Hello, ${myName}! My name is ${giraffe.name}.`,
		}),
		createGiraffe,
	})

	giraffeResolver.giraffe.resolve({ name: "Giraffe" })
	simpleGiraffeResolver.createGiraffe.resolve({ data: {} })
})
