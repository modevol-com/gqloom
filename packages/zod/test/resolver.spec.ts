import { test } from "vitest"
import { z } from "zod"
import { field, query, resolver } from "../src/resolver"

test("zod resolver", () => {
	const User = z
		.object({
			id: z.string(),
			name: z.string(),
		})
		.describe("User")

	resolver(User, {
		greeting: field(z.string(), {
			input: { name: z.string() },
			resolve(user, { name }) {
				return `Hello, ${name} by ${user.name}!`
			},
		}),

		hello: field(z.string().nonempty(), {
			resolve(user) {
				return `Hello, ${user.name}!`
			},
		}),

		getUser: query(User, {
			input: { id: z.string().nonempty() },
			resolve({ id }) {
				return { id: id, name: "John" }
			},
		}),
	})
})
