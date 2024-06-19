import {
  type NullishSchema,
  type OptionalSchema,
  type NullableSchema,
} from "valibot"
import { type PipedSchema } from "./types"

export const nullishTypes: Set<string> = new Set<
  (
    | NullableSchema<any, unknown>
    | NullishSchema<any, unknown>
    | OptionalSchema<any, unknown>
  )["type"]
>(["nullable", "nullish", "optional"])

export function isNullish(
  schema: PipedSchema
): schema is
  | NullableSchema<any, unknown>
  | NullishSchema<any, unknown>
  | OptionalSchema<any, unknown> {
  return nullishTypes.has(schema.type)
}
