import { test } from "vitest"
import { object, string } from "yup"
import { field, query, resolver } from "../src/resolver0"

test("yup resolver", () => {
	const User = object({
		id: string().required(),
		name: string().required(),
	}).label("User")

	resolver(User, {
		greeting: field(string().required(), {
			input: { name: string().required() },
			resolve(user, { name }) {
				return `Hello, ${name} by ${user.name}!`
			},
		}),

		hello: field(string().required(), {
			resolve(user) {
				return `Hello, ${user.name}!`
			},
		}),

		getUser: query(User, {
			input: { id: string().required() },
			resolve({ id }) {
				return { id: id, name: "John" }
			},
		}),
	})
})
