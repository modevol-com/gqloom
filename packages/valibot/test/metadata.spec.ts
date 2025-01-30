import { collectNames, resolver, weave } from "@gqloom/core"
import { printSchema } from "graphql"
import * as v from "valibot"
import { describe, expect, it } from "vitest"
import {
  ValibotMetadataCollector,
  ValibotWeaver,
  asEnumType,
  asObjectType,
} from "../src"

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

    let config

    config = ValibotMetadataCollector.getFieldConfig(name)
    expect(config).toMatchObject({ description: "some description" })

    const name2 = v.pipe(name, v.description("another description"))
    config = ValibotMetadataCollector.getFieldConfig(name2)
    expect(config).toMatchObject({ description: "another description" })

    const name3 = v.nullish(name)
    config = ValibotMetadataCollector.getFieldConfig(name3)
    expect(config).toMatchObject({ description: "some description" })

    const name4 = v.nonNullish(name)
    config = ValibotMetadataCollector.getFieldConfig(name4)
    expect(config).toMatchObject({ description: "some description" })
  })

  it("should get enum config", () => {
    const DiscussType = v.pipe(
      v.picklist(["question", "answer"]),
      asEnumType({ description: "discuss type" })
    )

    const config = ValibotMetadataCollector.getEnumConfig(DiscussType)
    expect(config).toMatchObject({ description: "discuss type" })

    const object = v.object({
      t1: DiscussType,
      t2: v.pipe(v.nonNullish(DiscussType), v.description("t2 description")),
      t3: v.pipe(DiscussType, v.description("t3 description")),
    })
    collectNames({ DiscussType, object })
    const r = resolver.of(object, {})
    const schema = weave(r, ValibotWeaver)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type object {
        t1: DiscussType!

        """t2 description"""
        t2: DiscussType!

        """t3 description"""
        t3: DiscussType!
      }

      """discuss type"""
      enum DiscussType {
        question
        answer
      }"
    `)
  })
})
