import * as v from "valibot"
import { describe, expect, it } from "vitest"
import { ValibotMetadataCollector, asObjectType } from "../src"

describe("asObjectType", () => {
  it("should return asObjectType", () => {
    const result = asObjectType({})
    expect(result).toMatchObject({
      type: "gqloom.asObjectType",
    })
  })

  it("should get GraphQL Object type config", () => {
    const o = v.pipe(
      v.object({
        id: v.string(),
        name: v.string(),
      }),
      asObjectType({
        name: "User",
        extensions: { some: "value" },
      })
    )

    expect(ValibotMetadataCollector.getObjectConfig(o)).toMatchObject({
      name: "User",
      extensions: { some: "value" },
    })
  })
})

describe("ValibotMetadataCollector", () => {
  it("should get description", () => {
    const name = v.pipe(v.string(), v.description("some description"))

    const config = ValibotMetadataCollector.getFieldConfig(name)

    expect(config).toMatchObject({
      description: "some description",
    })
  })
})
