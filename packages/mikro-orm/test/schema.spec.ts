import { getGraphQLType } from "@gqloom/core"
import { defineEntity } from "@mikro-orm/core"
import {
  GraphQLNonNull,
  type GraphQLObjectType,
  type GraphQLOutputType,
  printType,
} from "graphql"
import { describe, expect, it } from "vitest"
import { mikroSilk } from "../src"

describe("mikroSilk", () => {
  const Author = mikroSilk(
    defineEntity({
      name: "Author",
      properties: (p) => ({
        name: p.string(),
      }),
    })
  )

  const Book = mikroSilk(
    defineEntity({
      name: "Book",
      properties: (p) => ({
        ISBN: p.string().primary(),
        sales: p.float().hidden(false),
        title: p.string(),
        isPublished: p.boolean(),
        price: p.float().nullable(),
        tags: p.array().$type<string[]>(),
        author: () => p.manyToOne(Author),
      }),
    }),
    { extensions: { foo: "bar" } }
  )

  const gqlType = getGraphQLType(Book)

  it("should handle object", () => {
    expect(printType(unwrap(gqlType))).toMatchInlineSnapshot(`
      "type Book {
        ISBN: ID!
        title: String!
        isPublished: Boolean!
        price: Float
        tags: [String!]!
      }"
    `)

    expect(
      (getGraphQLType(Book.nullable()) as GraphQLObjectType).toConfig()
    ).toMatchObject({ extensions: { foo: "bar" } })

    expect(
      printType(getGraphQLType(Book.nullable()) as GraphQLObjectType)
    ).toEqual(printType(unwrap(gqlType)))

    expect(getGraphQLType(Book.list())).toMatchInlineSnapshot(`"[Book!]!"`)
  })

  it("should not expose hidden property", () => {
    expect(printType(unwrap(gqlType))).not.toMatch("sales")
  })

  it("should handle non null", () => {
    expect(unwrap(gqlType).getFields()["title"].type).toMatchInlineSnapshot(
      `"String!"`
    )
  })

  it("should handle nullable", () => {
    expect(unwrap(gqlType).getFields()["price"].type).toMatchInlineSnapshot(
      `"Float"`
    )
  })

  it("should handle array", () => {
    expect(unwrap(gqlType).getFields()["tags"].type).toMatchInlineSnapshot(
      `"[String!]!"`
    )
  })
})

function unwrap(gqlType: GraphQLOutputType) {
  if (gqlType instanceof GraphQLNonNull) {
    return gqlType.ofType as GraphQLObjectType
  }
  return gqlType as GraphQLObjectType
}
