import { isSilk, type Middleware } from "@gqloom/core"
import type { JSONSchema, JSONSilk } from "@gqloom/json"
import Ajv, { type ValidateFunction } from "ajv"
import { GraphQLError } from "graphql"

const ajv = new Ajv()
const validators = new WeakMap<JSONSchema & object, ValidateFunction>()
function validateAndThrow(schema: JSONSchema & object, value: any) {
  const validate = validators.get(schema) ?? ajv.compile(schema)
  if (!validators.has(schema)) validators.set(schema, validate)
  const valid = validate(value)
  if (!valid) {
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

  if (parseInput.result || !schema) return next()
  if (isSilk(schema)) {
    validateAndThrow(schema, parseInput.value)
  } else {
    for (const [key, argSchema] of Object.entries(schema)) {
      validateAndThrow(argSchema, parseInput.value[key])
    }
  }

  return next()
}
