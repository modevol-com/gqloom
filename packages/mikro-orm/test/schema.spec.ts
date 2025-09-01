import { field, getGraphQLType, query, resolver, weave } from "@gqloom/core"
import { ArrayType, DateTimeType, defineEntity } from "@mikro-orm/core"
import {
  GraphQLNonNull,
  type GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLScalarType,
  printSchema,
  printType,
} from "graphql"
import { describe, expect, it } from "vitest"
import { MikroWeaver, mikroSilk } from "../src"

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
        sales: p.integer(),
        salesRevenue: p.float().hidden(false),
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
        sales: Int!
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
    expect(printType(unwrap(gqlType))).not.toMatch("salesRevenue")
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
    const Entity = mikroSilk(
      defineEntity({
        name: "Entity",
        properties: (p) => ({
          strings: p.array().$type<string[]>(),
          numbers: p
            .type(new ArrayType((i) => +i))
            .runtimeType("number[]")
            .$type<number[]>(),
          numbers2: p.type("number[]").$type<number[]>(),
        }),
      })
    )

    const gqlType = getGraphQLType(Entity)

    expect(unwrap(gqlType).getFields()["strings"].type).toMatchInlineSnapshot(
      `"[String!]!"`
    )
    expect(unwrap(gqlType).getFields()["numbers"].type).toMatchInlineSnapshot(
      `"[Float!]!"`
    )
    expect(unwrap(gqlType).getFields()["numbers2"].type).toMatchInlineSnapshot(
      `"[Float!]!"`
    )
  })

  it("should handle preset types", () => {
    const GraphQLDate = new GraphQLScalarType<Date, string>({ name: "Date" })

    const config = MikroWeaver.config({
      presetGraphQLType: (property) => {
        if (Object.is(property.type, DateTimeType)) {
          return GraphQLDate
        }
      },
    })

    // Use config directly in weave to ensure preset types are applied
    const User = mikroSilk(
      defineEntity({
        name: "User",
        properties: (p) => ({
          id: p.string().primary(),
          createdAt: p.datetime(),
          updatedAt: p.datetime().nullable(),
        }),
      })
    )

    const r1 = resolver({
      user: query(User, () => ({
        id: "1",
        createdAt: new Date(),
        updatedAt: null,
      })),
      userNullable: query(User.nullable(), () => null),
      users: query(User.list(), () => []),
    })

    const schema = weave(config, r1)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Query {
        user: User!
        userNullable: User
        users: [User!]!
      }

      type User {
        id: ID!
        createdAt: Date!
        updatedAt: Date
      }

      scalar Date"
    `)
  })

  it("should handle config", () => {
    const User = mikroSilk(
      defineEntity({
        name: "User",
        properties: (p) => ({
          id: p.string().primary(),
          name: p.string(),
          email: p.string(),
          password: p.string().hidden(),
          createdAt: p.datetime(),
        }),
      }),
      {
        description: "用户信息",
      }
    )

    const GraphQLDateTime = new GraphQLScalarType<Date, string>({
      name: "DateTime",
    })

    const schema = weave(
      MikroWeaver.config({
        presetGraphQLType: (property) => {
          if (Object.is(property.type, DateTimeType)) {
            return GraphQLDateTime
          }
        },
      }),
      User
    )
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      """"用户信息"""
      type User {
        id: ID!
        name: String!
        email: String!
        createdAt: DateTime!
      }

      scalar DateTime"
    `)
  })

  it("should hide fields", () => {
    const User = mikroSilk(
      defineEntity({
        name: "User",
        properties: (p) => ({
          id: p.string().primary(),
          name: p.string(),
          email: p.string(),
          password: p.string(),
          password2: p.string(),
        }),
      }),
      {
        fields: {
          password: { type: null },
          password2: field.hidden,
        },
      }
    )

    expect(printType(unwrap(getGraphQLType(User)))).toMatchInlineSnapshot(`
      "type User {
        id: ID!
        name: String!
        email: String!
      }"
    `)
  })
})

function unwrap(gqlType: GraphQLOutputType) {
  if (gqlType instanceof GraphQLNonNull) {
    return gqlType.ofType as GraphQLObjectType
  }
  return gqlType as GraphQLObjectType
}
