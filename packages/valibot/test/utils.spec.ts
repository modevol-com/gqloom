import { describe, expect, it } from "vitest"
import * as v from "valibot"
import { flatVariant } from "../src/utils"

describe("flatVariant", () => {
  const VariantSchema = v.variant("type", [
    v.object({
      type: v.literal("email"),
      email: v.pipe(v.string(), v.email()),
    }),
    v.object({
      type: v.literal("url"),
      url: v.pipe(v.string(), v.url()),
    }),
    v.object({
      type: v.literal("date"),
      date: v.pipe(v.string(), v.isoDate()),
    }),
  ])
  const NestedVariantSchema = v.variant("type", [
    VariantSchema,
    v.object({
      type: v.literal("color"),
      date: v.pipe(v.string(), v.hexColor()),
    }),
  ])

  it("should flat Variant schema", () => {
    const schemas = flatVariant(VariantSchema)
    const variantList: string[] = []
    for (const schema of schemas) {
      expect(schema.type).toEqual("object")
      expect(schema.entries["type"].type).toEqual("literal")
      variantList.push(
        (schema.entries["type"] as v.LiteralSchema<string, any>).literal
      )
    }

    expect(variantList).toEqual(["email", "url", "date"])
  })

  it("should flat Nested Variant schema", () => {
    const schemas = flatVariant(NestedVariantSchema)
    const variantList: string[] = []
    for (const schema of schemas) {
      expect(schema.type).toEqual("object")
      expect(schema.entries["type"].type).toEqual("literal")
      variantList.push(
        (schema.entries["type"] as v.LiteralSchema<string, any>).literal
      )
    }

    expect(variantList).toEqual(["email", "url", "date", "color"])
  })
})
