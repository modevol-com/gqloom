import { test } from "vitest"
import { fabric } from "./fabric"
import {
	GraphQLFloat,
	GraphQLInt,
	GraphQLObjectType,
	GraphQLString,
} from "graphql"
import { baseResolver as resolver, baseField as field } from "./resolver"

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
				name: { type: GraphQLString },
				birthday: { type: GraphQLString },
				heightInMeters: { type: GraphQLFloat },
			},
		}),
	)

	resolver(Giraffe, {
		age: field(fabric<number>(GraphQLInt), (giraffe) => {
			return new Date().getFullYear() - giraffe.birthday.getFullYear()
		}),
		greeting: field(fabric<string>(GraphQLString), {
			input: { name: fabric<string>(GraphQLString) },
			resolve: (giraffe, { name }) =>
				`Hello, ${name}! My name is ${giraffe.name}.`,
		}),
	})
})
