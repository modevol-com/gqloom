import { getGraphQLType, query, resolver, weave } from "@gqloom/core"
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
import { describe, expect, it } from "vitest"
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
        Active
        Inactive
        PendingReview
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
        WithHyphen
        WithUnderscore
        WithSpace
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
        Admin
        User
        Guest
      }

      enum Priority {
        Low
        Medium
        High
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
        Admin
        User
        Guest
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
})

function unwrap(gqlType: GraphQLOutputType) {
  if (gqlType instanceof GraphQLNonNull) {
    return gqlType.ofType as GraphQLObjectType
  }
  return gqlType as GraphQLObjectType
}
