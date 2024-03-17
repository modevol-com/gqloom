import {
	GraphQLFloat,
	GraphQLInt,
	GraphQLNonNull,
	GraphQLObjectType,
	GraphQLString,
} from "graphql"
import { test } from "vitest"
import { fabric } from "./fabric"
import {
	baseField as field,
	baseMutation as mutation,
	baseQuery as query,
	baseResolver as resolver,
} from "./resolver"

test("base resolver", () => {
	interface IGiraffe {
		name: string
		birthday: Date
		heightInMeters: number
	}

	const Giraffe = fabric<IGiraffe>(
		new GraphQLObjectType<IGiraffe>({
			name: "Giraffe",
			fields: {
				name: { type: new GraphQLNonNull(GraphQLString) },
				birthday: { type: new GraphQLNonNull(GraphQLString) },
				heightInMeters: { type: new GraphQLNonNull(GraphQLFloat) },
			},
		}),
	)

	const GiraffeInput = fabric<Partial<IGiraffe>>(
		new GraphQLObjectType<Partial<IGiraffe>>({
			name: "GiraffeInput",
			fields: {
				name: { type: GraphQLString },
				birthday: { type: GraphQLString },
				heightInMeters: { type: GraphQLFloat },
			},
		}),
	)

	const simpleGiraffeResolver = resolver({
		giraffe: query(Giraffe, {
			input: { name: fabric<string>(GraphQLString) },
			resolve: ({ name }) => ({
				name,
				birthday: new Date(),
				heightInMeters: 5,
			}),
		}),
	})

	const giraffeResolver = resolver(Giraffe, {
		age: field(fabric<number>(GraphQLInt), (giraffe) => {
			return new Date().getFullYear() - giraffe.birthday.getFullYear()
		}),

		greeting: field(fabric<string>(GraphQLString), {
			input: { name: fabric<string>(GraphQLString) },
			resolve: (giraffe, { name }) =>
				`Hello, ${name}! My name is ${giraffe.name}.`,
		}),

		createGiraffe: mutation(Giraffe, {
			input: GiraffeInput,
			resolve: (input) => ({
				name: input.name ?? "Giraffe",
				birthday: input.birthday ?? new Date(),
				heightInMeters: input.heightInMeters ?? 5,
			}),
		}),
	})

	giraffeResolver.createGiraffe.resolve({})
	simpleGiraffeResolver.giraffe.resolve({ name: "Giraffe" })
})
