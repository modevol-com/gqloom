import { describe, it, expect } from "vitest"
import { type GraphQLObjectType, printType } from "graphql"
import { mikroSilk } from "../src"
import { EntitySchema } from "@mikro-orm/core"

const nullable = true

describe("MikroSilk", () => {
  interface IBook {
    title: string
    isPublished: boolean
    price: number
    tags: string[]
  }
  const BookSchema = new EntitySchema<IBook>({
    name: "Book",
    properties: {
      title: { type: "string" },
      isPublished: { type: "boolean" },
      price: { type: "number", nullable },
      tags: { type: "string[]", array: true },
    },
  })

  const gqlType = mikroSilk(BookSchema).getGraphQLType() as GraphQLObjectType

  it("should handle object", () => {
    expect(printType(gqlType)).toMatchInlineSnapshot(`
      "type Book {
        title: String!
        isPublished: Boolean!
        price: Float
        tags: [String!]!
      }"
    `)
  })

  it("should handle non null", () => {
    expect(gqlType.getFields()["title"].type).toMatchInlineSnapshot(`"String!"`)
  })

  it("should handle nullable", () => {
    expect(gqlType.getFields()["price"].type).toMatchInlineSnapshot(`"Float"`)
  })

  it("should handle array", () => {
    expect(gqlType.getFields()["tags"].type).toMatchInlineSnapshot(
      `"[String!]!"`
    )
  })
})
