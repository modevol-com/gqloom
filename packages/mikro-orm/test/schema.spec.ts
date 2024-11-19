import { getGraphQLType } from "@gqloom/core"
import { EntitySchema, type Ref } from "@mikro-orm/core"
import {
  GraphQLNonNull,
  type GraphQLObjectType,
  type GraphQLOutputType,
  printType,
} from "graphql"
import { describe, expect, it } from "vitest"
import { mikroSilk } from "../src"

const nullable = true

describe("MikroSilk", () => {
  interface IBook {
    ISBN: string
    sales: number
    title: string
    isPublished: boolean
    price: number
    tags: string[]
    author: Ref<IAuthor>
  }

  interface IAuthor {
    name: string
  }

  const Author = mikroSilk(
    new EntitySchema<IAuthor>({
      name: "Author",
      properties: {
        name: { type: "string" },
      },
    })
  )

  const Book = mikroSilk(
    new EntitySchema<IBook>({
      name: "Book",
      properties: {
        ISBN: { type: "string", primary: true },
        sales: { type: "number", hidden: false },
        title: { type: "string" },
        isPublished: { type: Boolean },
        price: { type: "number", nullable },
        tags: { type: "string[]", array: true },
        author: { entity: () => Author, kind: "m:1", ref: true },
      },
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
