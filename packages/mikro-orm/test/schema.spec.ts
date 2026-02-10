import {
  field,
  getGraphQLType,
  query,
  resolver,
  type StandardJSONSchemaV1,
  silk,
  weave,
} from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"
import { ArrayType, DateTimeType, defineEntity } from "@mikro-orm/core"
import type { MikroKyselyPluginOptions } from "@mikro-orm/sql"
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
import { describe, expect, expectTypeOf, it } from "vitest"
import { kyselySilk, MikroWeaver, mikroSilk } from "../src"

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

  describe("entitySilk.list() and entitySilk.nullable() validate", () => {
    describe("list()", () => {
      it("should reject non-array in validate", async () => {
        const Entity = mikroSilk(
          defineEntity({
            name: "Item",
            properties: (p) => ({
              id: p.string().primary(),
              name: p.string(),
            }),
          })
        )

        const result = await silk.parse(Entity.list(), "not an array" as never)

        expect(result).toHaveProperty("issues")
        expect(result.issues!).toHaveLength(1)
        expect(result.issues![0].message).toBe("Value must be an array")
      })

      it("should accept empty array and return empty array", async () => {
        const Entity = mikroSilk(
          defineEntity({
            name: "Item",
            properties: (p) => ({
              id: p.string().primary(),
              name: p.string(),
            }),
          })
        )

        const result = await silk.parse(Entity.list(), [])

        expect(result).toHaveProperty("value")
        if (result.issues) throw new Error("Expected no issues")
        expect(result.value).toEqual([])
      })

      it("should validate each element and return array", async () => {
        const Entity = mikroSilk(
          defineEntity({
            name: "Item",
            properties: (p) => ({
              id: p.string().primary(),
              name: p.string(),
            }),
          })
        )

        const result = await silk.parse(Entity.list(), [
          { id: "1", name: "a" },
          { id: "2", name: "b" },
        ])

        expect(result).toHaveProperty("value")
        if (result.issues) throw new Error("Expected no issues")
        expect(result.value).toEqual([
          { id: "1", name: "a" },
          { id: "2", name: "b" },
        ])
      })

      it("should collect issues with path when element validation fails", async () => {
        const Entity = mikroSilk(
          defineEntity({
            name: "Item",
            properties: (p) => ({
              id: p.string().primary(),
              name: p.string(),
            }),
          }),
          {
            fields: {
              id: v.string(),
              name: v.pipe(v.string(), v.minLength(2)),
            },
          }
        )

        const result = await silk.parse(Entity.list(), [
          { id: "1", name: "ab" },
          { id: "2", name: "x" },
          { id: "3", name: "cd" },
        ])

        expect(result).toHaveProperty("issues")
        const issues = result.issues!
        expect(issues.length).toBeGreaterThanOrEqual(1)
        expect(issues[0].message).toMatch(/length|min|Invalid/i)
        expect(issues[0].path).toEqual([1, "name"])
      })
    })

    describe("nullable()", () => {
      it("should accept null/undefined and return as value", async () => {
        const Entity = mikroSilk(
          defineEntity({
            name: "Item",
            properties: (p) => ({
              id: p.string().primary(),
              name: p.string(),
            }),
          })
        )

        const nullResult = await silk.parse(Entity.nullable(), null as never)
        const undefinedResult = await silk.parse(
          Entity.nullable(),
          undefined as never
        )

        expect(nullResult).toHaveProperty("value")
        if (nullResult.issues) throw new Error("Expected no issues")
        expect(nullResult.value).toBeNull()
        expect(undefinedResult).toHaveProperty("value")
        if (undefinedResult.issues) throw new Error("Expected no issues")
        expect(undefinedResult.value).toBeUndefined()
      })

      it("should delegate to origin validate for non-null value", async () => {
        const Entity = mikroSilk(
          defineEntity({
            name: "Item",
            properties: (p) => ({
              id: p.string().primary(),
              name: p.string(),
            }),
          })
        )

        const result = await silk.parse(Entity.nullable(), {
          id: "1",
          name: "hello",
        })

        expect(result).toHaveProperty("value")
        if (result.issues) throw new Error("Expected no issues")
        expect(result.value).toEqual({ id: "1", name: "hello" })
      })
    })
  })
})

describe("kyselySilk", () => {
  const AuthorEntity = defineEntity({
    name: "Author",
    properties: (p) => ({
      name: p.string().primary(),
    }),
  })

  const BookEntity = defineEntity({
    name: "Book",
    properties: (p) => ({
      isbn: p.string().primary(),
      sales: p.integer(),
      salesRevenue: p.float().hidden(false),
      title: p.string(),
      isPublished: p.boolean(),
      price: p.float().nullable(),
      tags: p.array().$type<string[]>(),
      author: () => p.manyToOne(AuthorEntity).ref(),
    }),
  })

  it("should handle kysely table", () => {
    const Author = kyselySilk(AuthorEntity)
    const Book = kyselySilk(BookEntity)

    type IAuthor = StandardJSONSchemaV1.InferOutput<typeof Author>
    type IBook = StandardJSONSchemaV1.InferOutput<typeof Book>

    expectTypeOf<IAuthor>().toEqualTypeOf<Partial<{ name: string }>>()
    expectTypeOf<IBook>().toEqualTypeOf<
      Partial<{
        isbn: string
        sales: number
        sales_revenue: number
        title: string
        is_published: NonNullable<boolean | null | undefined>
        price: number | null
        tags: string[]
        author_name: string
      }>
    >()
    const schema = weave(Author, Book)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Author {
        name: ID!
      }

      type Book {
        isbn: ID!
        sales: Int!
        sales_revenue: Float!
        title: String!
        is_published: Boolean!
        price: Float
        tags: [String!]!
        author_name: ID!
      }"
    `)
  })

  it("should handle kysely table with columnNamingStrategy: property", () => {
    const kyselyOptions = {
      columnNamingStrategy: "property",
      tableNamingStrategy: "entity",
    } as const satisfies MikroKyselyPluginOptions
    const Author = kyselySilk(AuthorEntity, kyselyOptions)
    const Book = kyselySilk(BookEntity, kyselyOptions)

    type IAuthor = StandardJSONSchemaV1.InferOutput<typeof Author>
    type IBook = StandardJSONSchemaV1.InferOutput<typeof Book>

    expectTypeOf<IAuthor>().toEqualTypeOf<Partial<{ name: string }>>()
    expectTypeOf<IBook>().toEqualTypeOf<
      Partial<{
        isbn: string
        sales: number
        salesRevenue: number
        title: string
        isPublished: NonNullable<boolean | null | undefined>
        price: number | null
        tags: string[]
        author: string
      }>
    >()
    const schema = weave(Author, Book)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Author {
        name: ID!
      }

      type Book {
        isbn: ID!
        sales: Int!
        salesRevenue: Float!
        title: String!
        isPublished: Boolean!
        price: Float
        tags: [String!]!
        author: ID!
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
