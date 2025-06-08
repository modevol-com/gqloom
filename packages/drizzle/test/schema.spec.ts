import {
  field,
  getGraphQLType,
  query,
  resolver,
  silk,
  weave,
} from "@gqloom/core"
import type { StandardSchemaV1 } from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"
import { pgTable } from "drizzle-orm/pg-core"
import * as pg from "drizzle-orm/pg-core"
import { sqliteTable } from "drizzle-orm/sqlite-core"
import * as sqlite from "drizzle-orm/sqlite-core"
import {
  GraphQLNonNull,
  type GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLScalarType,
  printSchema,
  printType,
} from "graphql"
import * as v from "valibot"
import { describe, expect, expectTypeOf, it } from "vitest"
import { DrizzleWeaver, drizzleSilk } from "../src"

describe("drizzleSilk", () => {
  it("should handle pg table and column types", () => {
    const moodEnum = pg.pgEnum("mood", ["sad", "ok", "happy"])
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
      })
    )

    const gqlType = getGraphQLType(Foo)
    expect(printType(unwrap(gqlType))).toMatchInlineSnapshot(`
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
        boolean: sqlite.integer({ mode: "boolean" }),
      })
    )

    const gqlType = getGraphQLType(Foo)
    expect(printType(unwrap(gqlType))).toMatchInlineSnapshot(`
      "type FooItem {
        integer: Int!
        real: Float
        text: String
        blob: [Int!]
        boolean: Boolean
      }"
    `)
  })

  it("should handle preset types", () => {
    const GraphQLDate = new GraphQLScalarType<Date, string>({ name: "Date" })

    const config = DrizzleWeaver.config({
      presetGraphQLType: (column) => {
        if (column.dataType === "date") {
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

  it("should throw error when not implemented", () => {
    const notImplemented1 = drizzleSilk(
      pgTable("not_implemented", {
        line: pg.line(),
      })
    )
    expect(() => getGraphQLType(notImplemented1)).toThrow(
      "Type: PgLine is not implemented!"
    )
    const customType = pg.customType<{
      data: number
      notNull: true
      default: true
    }>({
      dataType: () => "CustomType",
    })
    const notImplemented2 = drizzleSilk(
      pgTable("not_implemented", {
        customType: customType(),
      })
    )

    expect(() => getGraphQLType(notImplemented2)).toThrow(
      "Type: PgCustomColumn is not implemented!"
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
        getter: DateTime!
      }

      scalar DateTime"
    `)
  })
})

function unwrap(gqlType: GraphQLOutputType) {
  if (gqlType instanceof GraphQLNonNull) {
    return gqlType.ofType as GraphQLObjectType
  }
  return gqlType as GraphQLObjectType
}
