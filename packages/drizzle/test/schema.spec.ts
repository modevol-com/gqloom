import type { StandardSchemaV1 } from "@gqloom/core"
import {
  field,
  getGraphQLType,
  query,
  resolver,
  silk,
  weave,
} from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"
import { extractExtendedColumnType } from "drizzle-orm"
import * as pg from "drizzle-orm/pg-core"
import { pgTable } from "drizzle-orm/pg-core"
import * as sqlite from "drizzle-orm/sqlite-core"
import { sqliteTable } from "drizzle-orm/sqlite-core"
import {
  GraphQLFloat,
  GraphQLNonNull,
  type GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLScalarType,
  GraphQLString,
  printSchema,
  printType,
} from "graphql"
import * as v from "valibot"
import { describe, expect, expectTypeOf, it } from "vitest"
import { DrizzleWeaver, drizzleSilk } from "../src"

describe("drizzleSilk", () => {
  it("should handle pg table and column types", () => {
    const moodEnum = pg.pgEnum("mood", ["sad", "ok", "happy"])
    const fruitEnum = v.picklist(["apple", "banana", "orange"])
    const Foo = drizzleSilk(
      pgTable("foo", {
        serial: pg.serial().primaryKey(),
        integer: pg.integer(),
        boolean: pg.boolean(),
        text: pg.text(),
        textNotNull: pg.text().notNull(),
        varchar1: pg.varchar(),
        varchar2: pg.varchar({ length: 256 }),
        char1: pg.char(),
        char2: pg.char({ length: 256 }),
        numeric: pg.numeric(),
        real: pg.real(),
        double: pg.doublePrecision(),
        json: pg.json(),
        jsonb: pg.jsonb(),
        time: pg.time(),
        timestamp: pg.timestamp(),
        date: pg.date(),
        interval: pg.interval(),
        array: pg.text().array(),
        enum: moodEnum(),
        enum2: pg.text({ enum: fruitEnum.options }),
      }),
      {
        fields: () => ({
          enum2: { type: silk.getType(fruitEnum) },
        }),
      }
    )

    const schema = weave(ValibotWeaver, Foo)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type FooItem {
        serial: Int!
        integer: Int
        boolean: Boolean
        text: String
        textNotNull: String!
        varchar1: String
        varchar2: String
        char1: String
        char2: String
        numeric: String
        real: Float
        double: Float
        json: String
        jsonb: String
        time: String
        timestamp: String
        date: String
        interval: String
        array: [String!]
        enum: Mood
        enum2: FooItemEnum2
      }

      enum Mood {
        SAD
        OK
        HAPPY
      }

      enum FooItemEnum2 {
        apple
        banana
        orange
      }"
    `)
  })

  it("should infer type", () => {
    const Foo = drizzleSilk(
      pgTable("foo", {
        id: pg.serial().primaryKey(),
        name: pg.text(),
        password: pg.text(),
      }),
      {
        fields: {
          name: { description: "name of the foo" },
          password: field.hidden,
        },
      }
    )

    type IFoo = StandardSchemaV1.InferOutput<typeof Foo>

    type ExpectedFoo =
      | { name: string | null; id: number }
      | (Partial<{
          name: string | null
          id: number
          password: string | null
        }> & { __selective_foo_brand__: never })

    expectTypeOf<IFoo>().toMatchTypeOf<ExpectedFoo>()

    expectTypeOf<{
      name: string | null
      id: number
      password: string
    }>().toMatchTypeOf<IFoo>()

    expectTypeOf<{
      name: string | null
      id: number
    }>().toMatchTypeOf<IFoo>()

    expectTypeOf({ name: "Bob", id: 1 }).toMatchTypeOf<IFoo>()

    expectTypeOf<{
      __selective_foo_brand__: never
    }>().toMatchTypeOf<IFoo>()
  })

  it("should accept Silk field values in the type of fields", () => {
    const Foo = drizzleSilk(
      pgTable("typed_silk", {
        id: pg.serial().primaryKey(),
        email: pg.text(),
        password: pg.text(),
      }),
      {
        fields: {
          email: v.pipe(v.string(), v.email()),
          password: field.hidden,
        },
      }
    )
    type IFoo = StandardSchemaV1.InferOutput<typeof Foo>
    expectTypeOf<{ id: number; email: string | null }>().toMatchTypeOf<IFoo>()
  })

  it("should hide fields", () => {
    const Foo = drizzleSilk(
      pgTable("foo", {
        id: pg.serial().primaryKey(),
        name: pg.text(),
        password: pg.text(),
      }),
      {
        fields: { password: field.hidden },
      }
    )

    expect(
      printType(
        (getGraphQLType(Foo) as GraphQLNonNull<GraphQLObjectType>).ofType
      )
    ).toMatchInlineSnapshot(`
      "type FooItem {
        id: Int!
        name: String
      }"
    `)
  })

  it("should handle enum with different naming conventions", () => {
    const statusEnum = pg.pgEnum("status", [
      "active",
      "inactive",
      "pending_review",
    ])
    const Foo = drizzleSilk(
      pgTable("foo", {
        status: statusEnum(),
      })
    )

    const schema = weave(Foo)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type FooItem {
        status: Status
      }

      enum Status {
        ACTIVE
        INACTIVE
        PENDING_REVIEW
      }"
    `)
  })

  it("should handle enum with special characters", () => {
    const specialEnum = pg.pgEnum("special", [
      "with-hyphen",
      "with_underscore",
      "with space",
    ])
    const Foo = drizzleSilk(
      pgTable("foo", {
        special: specialEnum(),
      })
    )

    const schema = weave(Foo)

    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type FooItem {
        special: Special
      }

      enum Special {
        WITH_HYPHEN
        WITH_UNDERSCORE
        WITH_SPACE
      }"
    `)
  })

  it("should handle multiple enums in same table", () => {
    const roleEnum = pg.pgEnum("role", ["admin", "user", "guest"])
    const priorityEnum = pg.pgEnum("priority", ["low", "medium", "high"])
    const Foo = drizzleSilk(
      pgTable("foo", {
        role: roleEnum(),
        priority: priorityEnum(),
      })
    )

    const schema = weave(Foo)

    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type FooItem {
        role: Role
        priority: Priority
      }

      enum Role {
        ADMIN
        USER
        GUEST
      }

      enum Priority {
        LOW
        MEDIUM
        HIGH
      }"
    `)
  })

  it("should reuse same enum type across different tables", () => {
    const roleEnum = pg.pgEnum("role", ["admin", "user", "guest"])

    const User = drizzleSilk(
      pgTable("user", {
        id: pg.serial().primaryKey(),
        role: roleEnum(),
      })
    )

    const Post = drizzleSilk(
      pgTable("post", {
        id: pg.serial().primaryKey(),
        authorRole: roleEnum(),
      })
    )

    const schema = weave(User, Post)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type UserItem {
        id: Int!
        role: Role
      }

      enum Role {
        ADMIN
        USER
        GUEST
      }

      type PostItem {
        id: Int!
        authorRole: Role
      }"
    `)
  })

  it("should handle sqlite table and column types", () => {
    const Foo = drizzleSilk(
      sqliteTable("foo", {
        integer: sqlite.integer().primaryKey(),
        real: sqlite.real(),
        text: sqlite.text(),
        blob: sqlite.blob(),
        blobBuffer: sqlite.blob({ mode: "buffer" }),
        blobBigint: sqlite.blob({ mode: "bigint" }),
        boolean: sqlite.integer({ mode: "boolean" }),
      })
    )

    const gqlType = getGraphQLType(Foo)
    expect(printType(unwrap(gqlType))).toMatchInlineSnapshot(`
      "type FooItem {
        integer: Int!
        real: Float
        text: String
        blob: String
        blobBuffer: [Int!]
        blobBigint: String
        boolean: Boolean
      }"
    `)
  })

  it("should handle preset types", () => {
    const GraphQLDate = new GraphQLScalarType<Date, string>({ name: "Date" })

    const config = DrizzleWeaver.config({
      presetGraphQLType: (column) => {
        if (extractExtendedColumnType(column).constraint === "date") {
          return GraphQLDate
        }
      },
    })

    const Foo = drizzleSilk(
      pgTable("foo", {
        date: pg.timestamp(),
      })
    )

    const r1 = resolver({
      foo: query(Foo, () => ({ date: new Date() })),
      foo2: query(Foo.$nullable(), () => null),
      foos: query(Foo.$list(), () => []),
    })

    const schema = weave(DrizzleWeaver, config, r1)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type Query {
        foo: FooItem!
        foo2: FooItem
        foos: [FooItem!]!
      }

      type FooItem {
        date: Date
      }

      scalar Date"
    `)
  })

  it("should map geometric and custom column types", () => {
    const customType = pg.customType<{
      data: number
      notNull: true
      default: true
    }>({
      dataType: () => "CustomType",
    })
    const Foo = drizzleSilk(
      pgTable("foo", {
        line: pg.line(),
        customType: customType(),
      })
    )

    expect(printType(unwrap(getGraphQLType(Foo)))).toMatchInlineSnapshot(`
      "type FooItem {
        line: [Float!]
        customType: String
      }"
    `)
  })

  it("should throw error when column data type is not implemented", () => {
    const unknownColumn = {
      dataType: "unknown",
      columnType: "PgUnknown",
    } as never

    expect(() => DrizzleWeaver.getColumnType(unknownColumn)).toThrow(
      "Type: PgUnknown is not implemented!"
    )
  })

  it("should handle config", () => {
    const Foo = drizzleSilk(
      pgTable("foo", {
        id: pg.serial().primaryKey(),
        name: pg.text(),
        hidden: pg.text(),
        hidden2: pg.text(),
        getter: pg.text(),
      }),
      {
        description: "some description of the foo",
        fields: {
          name: { description: "name of the foo" },
          hidden: { type: null },
          hidden2: { type: field.hidden },
          getter: { type: () => silk.getType(v.date()) },
        },
      }
    )

    const GraphQLDateTime = new GraphQLScalarType<Date, string>({
      name: "DateTime",
    })

    const schema = weave(
      Foo,
      ValibotWeaver,
      ValibotWeaver.config({
        presetGraphQLType: (schema) => {
          switch (schema.type) {
            case "date":
              return GraphQLDateTime
          }
        },
      })
    )
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      """"some description of the foo"""
      type FooItem {
        id: Int!

        """name of the foo"""
        name: String
        getter: DateTime
      }

      scalar DateTime"
    `)
  })

  it("should accept Silk and GraphQL types as field values", () => {
    const User = drizzleSilk(
      pgTable("user", {
        id: pg.serial().primaryKey(),
        name: pg.text().notNull(),
        email: pg.text().notNull(),
        score: pg.integer().notNull(),
        password: pg.text().notNull(),
      }),
      {
        fields: {
          id: v.string(),
          name: v.pipe(v.string(), v.minLength(3), v.maxLength(20)),
          email: v.pipe(v.string(), v.email()),
          score: GraphQLFloat,
          password: field.hidden,
        },
      }
    )

    const schema = weave(
      ValibotWeaver,
      resolver({
        user: query(User, () => ({
          id: 1,
          name: "Alice",
          email: "alice@example.com",
          score: 1,
        })),
      })
    )
    const userType = schema.getType("UserItem") as GraphQLObjectType
    expect(printType(userType)).toMatchInlineSnapshot(`
      "type UserItem {
        id: String!
        name: String!
        email: String!
        score: Float!
      }"
    `)
  })

  it("should accept { type: Silk } the same as a Silk field value", () => {
    const asValue = drizzleSilk(
      pgTable("user_as_value", {
        id: pg.serial().primaryKey(),
        email: pg.text().notNull(),
      }),
      { fields: { email: v.pipe(v.string(), v.email()) } }
    )
    const asType = drizzleSilk(
      pgTable("user_as_type", {
        id: pg.serial().primaryKey(),
        email: pg.text().notNull(),
      }),
      { fields: { email: { type: v.pipe(v.string(), v.email()) } } }
    )

    const schema = weave(
      ValibotWeaver,
      resolver({
        asValue: query(asValue, () => ({ id: 1, email: "a@b.com" })),
        asType: query(asType, () => ({ id: 1, email: "a@b.com" })),
      })
    )
    const asValueType = schema.getType("UserAsValueItem") as GraphQLObjectType
    const asTypeType = schema.getType("UserAsTypeItem") as GraphQLObjectType
    expect(asValueType.getFields().email.type.toString()).toBe(
      asTypeType.getFields().email.type.toString()
    )
  })

  it("should accept GraphQL type as a field value", () => {
    const Entity = drizzleSilk(
      pgTable("entity", {
        id: pg.serial().primaryKey(),
        score: pg.integer().notNull(),
      }),
      { fields: { score: GraphQLFloat } }
    )
    expect(
      unwrap(getGraphQLType(Entity)).getFields().score.type.toString()
    ).toBe("Float!")
  })

  it("should resolve fields getters and type getters", () => {
    const User = drizzleSilk(
      pgTable("user_getter", {
        id: pg.serial().primaryKey(),
        name: pg.text().notNull(),
      }),
      {
        fields: () => ({
          id: v.string(),
          name: { type: () => v.pipe(v.string(), v.minLength(1)) },
        }),
      }
    )
    const schema = weave(
      ValibotWeaver,
      resolver({
        user: query(User, () => ({ id: 1, name: "a" })),
      })
    )
    const userType = schema.getType("UserGetterItem") as GraphQLObjectType
    expect(userType.getFields().name.type.toString()).toBe("String!")
  })

  it("should follow column optionality for custom NonNull types", () => {
    const Entity = drizzleSilk(
      pgTable("nullable_score", {
        id: pg.serial().primaryKey(),
        score: pg.integer(),
      }),
      { fields: { score: { type: () => new GraphQLNonNull(GraphQLFloat) } } }
    )
    expect(
      unwrap(getGraphQLType(Entity)).getFields().score.type.toString()
    ).toBe("Float")
  })

  it("should follow column optionality for custom nullable types", () => {
    const Entity = drizzleSilk(
      pgTable("required_score", {
        id: pg.serial().primaryKey(),
        score: pg.integer().notNull(),
      }),
      { fields: { score: GraphQLFloat } }
    )
    expect(
      unwrap(getGraphQLType(Entity)).getFields().score.type.toString()
    ).toBe("Float!")
  })

  it("should keep description when type is a Silk", () => {
    const User = drizzleSilk(
      pgTable("described_user", {
        id: pg.serial().primaryKey(),
        email: pg.text().notNull(),
      }),
      {
        fields: {
          email: {
            type: v.pipe(v.string(), v.email()),
            description: "unique email",
          },
        },
      }
    )
    const schema = weave(ValibotWeaver, User)
    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "type DescribedUserItem {
        id: Int!

        """unique email"""
        email: String!
      }"
    `)
  })

  describe("drizzleSilk validate (compileValidator)", () => {
    it("returns value as-is when no config is set", async () => {
      const User = drizzleSilk(
        pgTable("plain_user", {
          id: pg.serial().primaryKey(),
          name: pg.text(),
        })
      )
      const value = { id: 1, name: "x" }
      expect(await User["~standard"].validate(value)).toEqual({ value })
    })

    it("returns value as-is when config.fields is empty", async () => {
      const User = drizzleSilk(
        pgTable("empty_fields_user", {
          id: pg.serial().primaryKey(),
          name: pg.text(),
        }),
        { fields: {} }
      )
      const value = { id: 1, name: "x" }
      expect(await User["~standard"].validate(value)).toEqual({ value })
    })

    it("validates fields with Silk from config and returns merged value", async () => {
      const User = drizzleSilk(
        pgTable("valid_user", {
          id: pg.serial().primaryKey(),
          name: pg.text(),
        }),
        { fields: { name: v.pipe(v.string(), v.minLength(1)) } }
      )
      expect(await User["~standard"].validate({ id: 1, name: "ok" })).toEqual({
        value: { id: 1, name: "ok" },
      })
    })

    it("returns issues with path prefixed when Silk validation fails", async () => {
      const User = drizzleSilk(
        pgTable("invalid_user", {
          id: pg.serial().primaryKey(),
          name: pg.text(),
          email: pg.text(),
        }),
        {
          fields: {
            name: v.pipe(v.string(), v.minLength(2)),
            email: v.pipe(v.string(), v.email()),
          },
        }
      )
      const result = await User["~standard"].validate({
        id: 1,
        name: "x",
        email: "invalid-email",
      })
      expect(result).toHaveProperty("issues")
      expect(result.issues).toHaveLength(2)
      expect(result.issues?.map((issue) => issue.path?.[0]).sort()).toEqual([
        "email",
        "name",
      ])
    })

    it("skips validation for keys not present in value", async () => {
      const User = drizzleSilk(
        pgTable("partial_user", {
          id: pg.serial().primaryKey(),
          name: pg.text(),
        }),
        { fields: { name: v.pipe(v.string(), v.minLength(1)) } }
      )
      expect(await User["~standard"].validate({ id: 1 })).toEqual({
        value: { id: 1 },
      })
    })

    it("extracts validator from { type: Silk } and fields getter", async () => {
      const nameSilk = silk(GraphQLString, (value) => {
        if (typeof value !== "string" || value.length < 2) {
          return { issues: [{ message: "too short" }] }
        }
        return { value }
      })
      const asType = drizzleSilk(
        pgTable("silk_type_user", {
          id: pg.serial().primaryKey(),
          name: pg.text(),
        }),
        { fields: { name: { type: nameSilk } } }
      )
      const asGetter = drizzleSilk(
        pgTable("silk_getter_user", {
          id: pg.serial().primaryKey(),
          name: pg.text(),
        }),
        { fields: () => ({ name: nameSilk }) }
      )

      expect(
        (await asType["~standard"].validate({ id: 1, name: "x" })).issues
      ).toBeDefined()
      expect(
        await asGetter["~standard"].validate({ id: 1, name: "ok" })
      ).toEqual({ value: { id: 1, name: "ok" } })
    })

    it("does not validate pure GraphQL types", async () => {
      const User = drizzleSilk(
        pgTable("gql_only_user", {
          id: pg.serial().primaryKey(),
          score: pg.integer(),
        }),
        { fields: { score: GraphQLFloat } }
      )
      const value = { id: 1, score: "not-a-number" }
      expect(await User["~standard"].validate(value)).toEqual({ value })
    })
  })
})

function unwrap(gqlType: GraphQLOutputType) {
  if (gqlType instanceof GraphQLNonNull) {
    return gqlType.ofType as GraphQLObjectType
  }
  return gqlType as GraphQLObjectType
}
