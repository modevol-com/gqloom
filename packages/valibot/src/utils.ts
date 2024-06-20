import {
  type NullishSchema,
  type OptionalSchema,
  type NullableSchema,
  type VariantOptions,
  type VariantOptionsAsync,
  type VariantSchema,
  type VariantSchemaAsync,
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

type FlatVariantSchema = Exclude<
  VariantOptionsAsync<string>[number],
  { type: "variant" }
>

export function flatVariant(
  schema:
    | VariantSchema<string, VariantOptions<string>, any>
    | VariantSchemaAsync<string, VariantOptionsAsync<string>, any>,
  flatten: FlatVariantSchema[] = []
): FlatVariantSchema[] {
  for (const item of schema.options) {
    if (item.type === "variant") {
      flatVariant(item, flatten)
    } else {
      flatten.push(item)
    }
  }
  return flatten
}
