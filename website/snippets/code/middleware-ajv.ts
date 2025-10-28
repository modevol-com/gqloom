import { isSilk, type Middleware } from "@gqloom/core"
import type { JSONSchema, JSONSilk } from "@gqloom/json"
import Ajv, { type ValidateFunction } from "ajv"
import { GraphQLError } from "graphql"

// Initialize Ajv instance for JSON schema validation.
const ajv = new Ajv()
// Cache compiled validation functions to avoid recompilation for the same schema.
const validators = new WeakMap<JSONSchema & object, ValidateFunction>()

function validateAndThrow(schema: JSONSchema & object, value: any) {
  // Retrieve compiled validator from cache or compile it if not found.
  const validate = validators.get(schema) ?? ajv.compile(schema)
  // Cache the compiled validator if it wasn't already there.
  if (!validators.has(schema)) validators.set(schema, validate)

  const valid = validate(value)
  if (!valid) {
    // If validation fails, throw a GraphQLError with details.
    throw new GraphQLError(validate.errors?.[0]?.message ?? "Invalid input", {
      extensions: { issues: validate.errors },
    })
  }
}

export const inputValidator: Middleware = async ({ next, parseInput }) => {
  const schema:
    | JSONSilk<JSONSchema, any>
    | Record<string, JSONSilk<JSONSchema, any>>
    | undefined = parseInput.schema

  // If input is already parsed or no schema is provided, skip validation.
  if (parseInput.result || !schema) return next()

  // Handle single JSONSilk schema validation.
  if (isSilk(schema)) {
    validateAndThrow(schema, parseInput.value)
  } else {
    // Handle validation for a map of schemas (e.g., for multiple arguments).
    for (const [key, argSchema] of Object.entries(schema)) {
      validateAndThrow(argSchema, parseInput.value[key])
    }
  }

  return next()
}
