import { it, test } from "vitest";
import { string, object } from "yup";
import { field, resolver } from "../src/resolver";

test("resolver", () => {
	const User = object({
		name: string().required(),
	}).label("User");

	resolver(User, {
		greeting: field(string().required(), {
			input: string(),
			resolve(parent, name) {
				return `Hello, ${name} by ${parent.name}!`;
			},
		}),
	});
});
