import { describe, it, expect } from "vitest"
import { type GraphQLObjectType, printType } from "graphql"
import { mikroSilk } from "../src"
import { EntitySchema, type Ref } from "@mikro-orm/core"

const nullable = true

describe("MikroSilk", () => {
  interface IBook {
    title: string
    isPublished: boolean
    price: number
    tags: string[]
    author: Ref<IAuthor>
  }

  interface IAuthor {
    name: string
  }

  const AuthorSchema = new EntitySchema<IAuthor>({
    name: "Author",
    properties: {
      name: { type: "string" },
    },
  })

  const BookSchema = new EntitySchema<IBook>({
    name: "Book",
    properties: {
      title: { type: "string" },
      isPublished: { type: Boolean },
      price: { type: "number", nullable },
      tags: { type: "string[]", array: true },
      author: { entity: () => AuthorSchema, kind: "m:1", ref: true },
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
