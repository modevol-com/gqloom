import { field, getGraphQLType, query, resolver, weave } from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"
import { ArrayType, DateTimeType, defineEntity } from "@mikro-orm/core"
import {
  GraphQLFloat,
  GraphQLNonNull,
  type GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLScalarType,
  printSchema,
  printType,
} from "graphql"
import * as v from "valibot"
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
        name: "RenameUser",
        fields: {
          password: { type: null },
          password2: field.hidden,
        },
      }
    )

    expect(printType(unwrap(getGraphQLType(User)))).toMatchInlineSnapshot(`
      "type RenameUser {
        id: ID!
        name: String!
        email: String!
      }"
    `)
  })

  it("should work with circular references", () => {
    const ChanelEntity = defineEntity({
      name: "Chanel",
      properties: (p) => ({
        id: p.string().primary(),
        name: p.string(),
        messages: () => p.oneToMany(MessageEntity).mappedBy("chanel"),
      }),
    })
    const Chanel = mikroSilk(ChanelEntity, {})

    const MessageEntity = defineEntity({
      name: "Message",
      properties: (p) => ({
        id: p.string().primary(),
        content: p.string(),
        chanel: () => p.manyToOne(ChanelEntity),
      }),
    })
    const Message = mikroSilk(MessageEntity, {})

    const schema = weave(Chanel, Message)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Chanel {
        id: ID!
        name: String!
      }

      type Message {
        id: ID!
        content: String!
      }"
    `)
  })

  it("should handle config.fields", async () => {
    const User = mikroSilk(
      defineEntity({
        name: "User",
        properties: (p) => ({
          id: p.string().primary(),
          name: p.string(),
          email: p.string(),
          password: p.string(),
        }),
      }),
      {
        fields: {
          id: v.string(),
          name: v.pipe(v.string(), v.minLength(3), v.maxLength(20)),
          email: v.pipe(v.string(), v.email()),
          password: field.hidden,
        },
      }
    )

    expect(
      (
        await User["~standard"].validate({
          name: "J",
        })
      ).issues
    ).toMatchObject([
      {
        message: "Invalid length: Expected >=3 but received 1",
        path: ["name"],
      },
    ])

    const emailResult = await User["~standard"].validate({
      email: "invalid-email",
    })
    expect(emailResult.issues).toBeDefined()
    expect(emailResult.issues).toHaveLength(1)
    expect(emailResult.issues![0].path).toEqual(["email"])
    expect(emailResult.issues![0].message).toMatchInlineSnapshot(
      `"Invalid email: Received "invalid-email""`
    )

    // Weave with ValibotWeaver so field Silks (Valibot schemas) can be resolved to GraphQL types
    const schema = weave(
      ValibotWeaver,
      resolver({
        user: query(User, () => ({
          id: "",
          name: "",
          email: "",
        })),
      })
    )
    const userType = schema.getType("User") as GraphQLObjectType
    expect(printType(userType)).toMatchInlineSnapshot(`
      "type User {
        id: String!
        name: String!
        email: String!
      }"
    `)
  })

  it("should handle config.fields as function (getter)", async () => {
    const User = mikroSilk(
      defineEntity({
        name: "User",
        properties: (p) => ({
          id: p.string().primary(),
          name: p.string(),
        }),
      }),
      {
        fields: () => ({
          id: v.string(),
          name: v.pipe(v.string(), v.minLength(1)),
        }),
      }
    )
    const result = await User["~standard"].validate({ id: "1", name: "a" })
    if (!("value" in result)) throw new Error("validate failed")
    expect(result.value).toEqual({ id: "1", name: "a" })
    const schema = weave(
      ValibotWeaver,
      resolver({
        user: query(User, () => ({ id: "", name: "" })),
      })
    )
    const userType = schema.getType("User") as GraphQLObjectType
    expect(userType.getFields().name.type.toString()).toBe("String!")
  })

  it("should handle config.fields with { type: GraphQLType }", () => {
    const Entity = mikroSilk(
      defineEntity({
        name: "Entity",
        properties: (p) => ({
          id: p.string().primary(),
          score: p.integer(),
        }),
      }),
      {
        fields: {
          score: { type: GraphQLFloat },
        },
      }
    )
    const gqlType = unwrap(getGraphQLType(Entity) as GraphQLOutputType)
    expect(gqlType.getFields().score.type.toString()).toBe("Float!")
  })

  it("should fallback unknown property type to GraphQLString (getFieldType default)", () => {
    const Entity = mikroSilk(
      defineEntity({
        name: "Entity",
        properties: (p) => ({
          id: p.string().primary(),
          data: p.type("json"),
        }),
      })
    )
    const gqlType = unwrap(getGraphQLType(Entity) as GraphQLOutputType)
    expect(gqlType.getFields().data.type.toString()).toBe("String!")
  })

  it("should follow entity optionality for output (custom NonNull on nullable entity field becomes nullable)", () => {
    const Entity = mikroSilk(
      defineEntity({
        name: "Entity",
        properties: (p) => ({
          id: p.string().primary(),
          score: p.integer().nullable(),
        }),
      }),
      { fields: { score: { type: () => new GraphQLNonNull(GraphQLFloat) } } }
    )
    const gqlType = unwrap(getGraphQLType(Entity) as GraphQLOutputType)
    expect(gqlType.getFields().score.type.toString()).toBe("Float")
  })

  it("should follow entity optionality for output (custom nullable on required entity field becomes non-null)", () => {
    const Entity = mikroSilk(
      defineEntity({
        name: "Entity",
        properties: (p) => ({
          id: p.string().primary(),
          score: p.integer(),
        }),
      }),
      { fields: { score: { type: GraphQLFloat } } }
    )
    const gqlType = unwrap(getGraphQLType(Entity) as GraphQLOutputType)
    expect(gqlType.getFields().score.type.toString()).toBe("Float!")
  })
})

function unwrap(gqlType: GraphQLOutputType) {
  if (gqlType instanceof GraphQLNonNull) {
    return gqlType.ofType as GraphQLObjectType
  }
  return gqlType as GraphQLObjectType
}
